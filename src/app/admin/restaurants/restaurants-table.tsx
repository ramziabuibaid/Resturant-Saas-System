"use client";

import { useState } from "react";
import Link from "next/link";
import type { Restaurant } from "@/lib/types/database";
import {
  createRestaurant,
  deleteRestaurant,
  updateRestaurantSubdomain,
} from "@/app/actions/super-admin";
import {
  createOrUpdateOwnerCredentials,
  updateOwnerPassword,
} from "@/app/actions/owner-credentials";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, Trash2Icon, UserPlusIcon, KeyRoundIcon } from "lucide-react";

type RestaurantsTableProps = {
  initialRestaurants: Restaurant[];
  ownerUsernames: Record<string, string | null>;
};

export function RestaurantsTable({
  initialRestaurants,
  ownerUsernames: initialOwnerUsernames,
}: RestaurantsTableProps) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [ownerUsernames, setOwnerUsernames] = useState(initialOwnerUsernames);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [status, setStatus] = useState<"active" | "suspended" | "trial">("active");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [ownerDialogRestaurant, setOwnerDialogRestaurant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState("");
  const [ownerSubmitError, setOwnerSubmitError] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  const [passwordDialogRestaurant, setPasswordDialogRestaurant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordSubmitError, setPasswordSubmitError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [subdomainDialogRestaurant, setSubdomainDialogRestaurant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newSubdomain, setNewSubdomain] = useState("");
  const [subdomainSubmitError, setSubdomainSubmitError] = useState<string | null>(null);
  const [subdomainLoading, setSubdomainLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    const result = await createRestaurant({ name: name.trim(), subdomain: subdomain.trim(), status });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      setRestaurants((prev) => [...prev, result.data!]);
      setName("");
      setSubdomain("");
      setStatus("active");
      setOpen(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`حذف المطعم "${name}"؟ لا يمكن التراجع.`)) return;
    const result = await deleteRestaurant(id);
    if (!result.error) setRestaurants((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleCreateOwner() {
    if (!ownerDialogRestaurant) return;
    setOwnerSubmitError(null);
    if (ownerPassword !== ownerPasswordConfirm) {
      setOwnerSubmitError("كلمة المرور غير متطابقة");
      return;
    }
    setOwnerLoading(true);
    const result = await createOrUpdateOwnerCredentials(
      ownerDialogRestaurant.id,
      ownerUsername,
      ownerPassword
    );
    setOwnerLoading(false);
    if (result.error) {
      setOwnerSubmitError(result.error);
      return;
    }
    setOwnerUsernames((prev) => ({ ...prev, [ownerDialogRestaurant.id]: ownerUsername.trim().toLowerCase() }));
    setOwnerDialogRestaurant(null);
    setOwnerUsername("");
    setOwnerPassword("");
    setOwnerPasswordConfirm("");
  }

  async function handleChangePassword() {
    if (!passwordDialogRestaurant) return;
    setPasswordSubmitError(null);
    if (newPassword !== newPasswordConfirm) {
      setPasswordSubmitError("كلمة المرور غير متطابقة");
      return;
    }
    setPasswordLoading(true);
    const result = await updateOwnerPassword(passwordDialogRestaurant.id, newPassword);
    setPasswordLoading(false);
    if (result.error) {
      setPasswordSubmitError(result.error);
      return;
    }
    setPasswordDialogRestaurant(null);
    setNewPassword("");
    setNewPasswordConfirm("");
  }

  async function handleChangeSubdomain() {
    if (!subdomainDialogRestaurant) return;
    setSubdomainSubmitError(null);
    setSubdomainLoading(true);

    const result = await updateRestaurantSubdomain(subdomainDialogRestaurant.id, newSubdomain);

    setSubdomainLoading(false);
    if (result.error) {
      setSubdomainSubmitError(result.error);
      return;
    }

    const normalized = newSubdomain.trim().toLowerCase().replace(/\s+/g, "-");
    setRestaurants((prev) =>
      prev.map((r) => (r.id === subdomainDialogRestaurant.id ? { ...r, subdomain: normalized } : r))
    );

    setSubdomainDialogRestaurant(null);
    setNewSubdomain("");
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>جميع المطاعم</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <PlusIcon className="size-4" />
            إضافة مطعم جديد
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مطعم</DialogTitle>
              <DialogDescription>
                إضافة مطعم جديد. يمكنك لاحقاً ربط مالك من صفحة إكمال الملف أو من قاعدة البيانات.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مطعم البركة"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subdomain">النطاق الفرعي</Label>
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="مثال: albaraka"
                />
                <p className="text-xs text-muted-foreground">
                  يظهر المنيو للعملاء على: {subdomain || "subdomain"}.yourdomain.com
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">الحالة</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "suspended" | "trial")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">نشط</option>
                  <option value="trial">تجريبي</option>
                  <option value="suspended">موقوف</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreate} disabled={loading || !name.trim() || !subdomain.trim()}>
                {loading ? "جاري الإضافة…" : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>النطاق الفرعي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>مستخدم الدخول</TableHead>
              <TableHead className="w-[140px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  لا توجد مطاعم بعد. أضف واحداً من الأعلى.
                </TableCell>
              </TableRow>
            ) : (
              restaurants.map((r) => {
                const username = ownerUsernames[r.id] ?? null;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.subdomain}</code>
                    </TableCell>
                    <TableCell>
                      <span>{r.status === "active" ? "نشط" : r.status === "trial" ? "تجريبي" : "موقوف"}</span>
                    </TableCell>
                    <TableCell>
                      {username ? (
                        <span className="text-muted-foreground">{username}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog
                          open={ownerDialogRestaurant?.id === r.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setOwnerDialogRestaurant(null);
                              setOwnerSubmitError(null);
                            } else {
                              setOwnerDialogRestaurant({ id: r.id, name: r.name });
                              setOwnerUsername(ownerUsernames[r.id] ?? "");
                              setOwnerPassword("");
                              setOwnerPasswordConfirm("");
                            }
                          }}
                        >
                          <DialogTrigger className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                            <UserPlusIcon className="size-4" />
                            {username ? "تعديل" : "إنشاء مستخدم"}
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>
                                {username ? "تعديل مستخدم الدخول" : "إنشاء مستخدم الدخول"}
                              </DialogTitle>
                              <DialogDescription>
                                {username
                                  ? `تعديل اسم المستخدم أو كلمة المرور لصاحب مطعم "${r.name}".`
                                  : `إنشاء اسم مستخدم وكلمة مرور لصاحب مطعم "${r.name}". سيتسنى له الدخول من نطاق المطعم (مثل ${r.subdomain}.localhost) باسم المستخدم وكلمة المرور.`}
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleCreateOwner();
                              }}
                              className="contents"
                            >
                              <div className="grid gap-4 py-4">
                                {ownerSubmitError && (
                                  <p className="text-sm text-destructive">{ownerSubmitError}</p>
                                )}
                                <div className="grid gap-2">
                                  <Label htmlFor="owner-username">اسم المستخدم</Label>
                                  <Input
                                    id="owner-username"
                                    value={ownerUsername}
                                    onChange={(e) => setOwnerUsername(e.target.value)}
                                    placeholder="مثال: admin"
                                    dir="ltr"
                                    className="font-mono"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="owner-password">
                                    {username ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"}
                                  </Label>
                                  <Input
                                    id="owner-password"
                                    type="password"
                                    value={ownerPassword}
                                    onChange={(e) => setOwnerPassword(e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="owner-password-confirm">تأكيد كلمة المرور</Label>
                                  <Input
                                    id="owner-password-confirm"
                                    type="password"
                                    value={ownerPasswordConfirm}
                                    onChange={(e) => setOwnerPasswordConfirm(e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setOwnerDialogRestaurant(null)}
                                >
                                  إلغاء
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={
                                    ownerLoading ||
                                    !ownerUsername.trim() ||
                                    (!username && (!ownerPassword || ownerPassword !== ownerPasswordConfirm)) ||
                                    (ownerPassword.length > 0 && ownerPassword !== ownerPasswordConfirm)
                                  }
                                >
                                  {ownerLoading ? "جاري الحفظ…" : username ? "حفظ" : "إنشاء"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        {username && (
                          <Dialog
                            open={passwordDialogRestaurant?.id === r.id}
                            onOpenChange={(open) => {
                              if (!open) setPasswordDialogRestaurant(null);
                              else setPasswordDialogRestaurant({ id: r.id, name: r.name });
                            }}
                          >
                            <DialogTrigger className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                              <KeyRoundIcon className="size-4" />
                              تغيير كلمة المرور
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>تغيير كلمة المرور</DialogTitle>
                                <DialogDescription>
                                  تعيين كلمة مرور جديدة لصاحب مطعم "{r.name}" (مستخدم: {username}).
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                {passwordSubmitError && (
                                  <p className="text-sm text-destructive">{passwordSubmitError}</p>
                                )}
                                <div className="grid gap-2">
                                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                                  <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="new-password-confirm">تأكيد كلمة المرور</Label>
                                  <Input
                                    id="new-password-confirm"
                                    type="password"
                                    value={newPasswordConfirm}
                                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setPasswordDialogRestaurant(null)}
                                >
                                  إلغاء
                                </Button>
                                <Button
                                  onClick={handleChangePassword}
                                  disabled={
                                    passwordLoading ||
                                    !newPassword ||
                                    newPassword.length < 6 ||
                                    newPassword !== newPasswordConfirm
                                  }
                                >
                                  {passwordLoading ? "جاري الحفظ…" : "حفظ"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Link href={`/menu/${r.subdomain}`} target="_blank" rel="noreferrer">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
                          >
                            المنيو العام
                          </Button>
                        </Link>
                        <Dialog
                          open={subdomainDialogRestaurant?.id === r.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setSubdomainDialogRestaurant(null);
                              setSubdomainSubmitError(null);
                              return;
                            }
                            setSubdomainDialogRestaurant({ id: r.id, name: r.name });
                            setNewSubdomain(r.subdomain ?? "");
                            setSubdomainSubmitError(null);
                          }}
                        >
                          <DialogTrigger className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                            تعديل النطاق
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>تعديل النطاق الفرعي</DialogTitle>
                              <DialogDescription>
                                تعيين نطاق جديد للمطعم "{r.name}". سيؤثر على رابط المنيو العام.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                              {subdomainSubmitError && (
                                <p className="text-sm text-destructive">{subdomainSubmitError}</p>
                              )}
                              <div className="grid gap-2">
                                <Label htmlFor="new-subdomain">النطاق الفرعي الجديد</Label>
                                <Input
                                  id="new-subdomain"
                                  value={newSubdomain}
                                  onChange={(e) =>
                                    setNewSubdomain(
                                      e.target.value.toLowerCase().replace(/\s+/g, "-")
                                    )
                                  }
                                  placeholder="مثال: albaraka"
                                  dir="ltr"
                                  className="font-mono"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                المنيو سيكون متاحاً عند: <code>{newSubdomain || r.subdomain}.localhost</code>
                              </p>
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSubdomainDialogRestaurant(null);
                                }}
                              >
                                إلغاء
                              </Button>
                              <Button
                                onClick={handleChangeSubdomain}
                                disabled={
                                  subdomainLoading || !newSubdomain.trim() || newSubdomain.trim() === r.subdomain
                                }
                              >
                                {subdomainLoading ? "جاري الحفظ…" : "حفظ"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(r.id, r.name)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
