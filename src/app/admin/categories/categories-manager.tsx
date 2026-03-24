"use client";

import { useState, useEffect } from "react";
import type { Category } from "@/lib/types/database";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/admin-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CategoriesManagerProps = {
  restaurantId: string;
  initialCategories: Category[];
};

export function CategoriesManager({
  restaurantId,
  initialCategories,
}: CategoriesManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = addName.trim();
    if (!name) return;
    setAdding(true);
    setCategories((prev) => [
      ...prev,
      { id: "temp", restaurant_id: restaurantId, name } as Category,
    ]);
    const { data, error } = await createCategory(restaurantId, name);
    setAdding(false);
    if (error) {
      setCategories(initialCategories);
      showMsg("err", error);
      return;
    }
    showMsg("ok", "Category added.");
    setAddName("");
    if (data) setCategories((prev) => prev.map((c) => (c.id === "temp" ? data : c)));
  }

  function openEdit(cat: Category) {
    setEditCategory(cat);
    setEditName(cat.name);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editCategory) return;
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    setCategories((prev) =>
      prev.map((c) => (c.id === editCategory.id ? { ...c, name } : c))
    );
    const { error } = await updateCategory(editCategory.id, name);
    setSaving(false);
    if (error) {
      setCategories(initialCategories);
      showMsg("err", error);
      return;
    }
    showMsg("ok", "Category updated.");
    setEditCategory(null);
  }

  async function handleDelete() {
    if (!deleteCategoryId) return;
    setDeleting(true);
    setCategories((prev) => prev.filter((c) => c.id !== deleteCategoryId));
    const { error } = await deleteCategory(deleteCategoryId, restaurantId);
    setDeleting(false);
    setDeleteCategoryId(null);
    if (error) {
      setCategories(initialCategories);
      showMsg("err", error);
      return;
    }
    showMsg("ok", "Category deleted.");
  }

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Mains"
                disabled={adding}
              />
            </div>
            <div className="flex items-end pb-2">
              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground">No categories yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(cat)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategoryId(cat.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editCategory} onOpenChange={() => setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={saving}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditCategory(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cannot be undone. Menu items in this category will become uncategorized.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
