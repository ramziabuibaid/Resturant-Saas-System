"use client";

import { useState } from "react";
import Link from "next/link";
import type { RestaurantWithOwner } from "@/app/actions/super-admin";
import { createRestaurant, deleteRestaurant } from "@/app/actions/super-admin";
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
import { PlusIcon, Trash2Icon } from "lucide-react";

type RestaurantsTableProps = {
  initialRestaurants: RestaurantWithOwner[];
};

export function RestaurantsTable({ initialRestaurants }: RestaurantsTableProps) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [status, setStatus] = useState<"active" | "suspended" | "trial">("active");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setRestaurants((prev) => [...prev, { ...result.data!, owner_username: null }]);
      setName("");
      setSubdomain("");
      setStatus("active");
      setOpen(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete restaurant "${name}"? This cannot be undone.`)) return;
    setError(null);
    const result = await deleteRestaurant(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRestaurants((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>All restaurants</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <PlusIcon className="size-4" />
            Create New Restaurant
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create restaurant</DialogTitle>
              <DialogDescription>
                Add a new restaurant. You can assign an owner later from the complete-profile flow or manually in the database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Albaraka Restaurant"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="e.g. albaraka"
                />
                <p className="text-xs text-muted-foreground">
                  Customers will see the menu at {subdomain || "subdomain"}.yourdomain.com
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "suspended" | "trial")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading || !name.trim() || !subdomain.trim()}>
                {loading ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Owner username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No restaurants yet. Create one above.
                </TableCell>
              </TableRow>
            ) : (
              restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.subdomain}</code>
                  </TableCell>
                  <TableCell className="font-medium">{r.owner_username ?? "—"}</TableCell>
                  <TableCell>
                    <span className="capitalize">{r.status ?? "active"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
