import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("none");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["admin-categories"] }); void qc.invalidateQueries({ queryKey: ["categories"] }); };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    const { error } = await supabase.from("categories").insert({
      name: name.trim(), slug: slugify(name), parent_id: parent === "none" ? null : parent, sort_order: (data.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) return void toast.error(error.message.includes("duplicate") ? "A category with that name already exists." : error.message);
    setName("");
    toast.success("Category added");
    refresh();
  };
  const patch = async (id: string, p: { name?: string; is_active?: boolean; sort_order?: number }) => {
    const { error } = await supabase.from("categories").update(p).eq("id", id);
    if (error) return void toast.error(error.message);
    refresh();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const a = data[idx];
    const b = data[idx + dir];
    if (!a || !b) return;
    await Promise.all([patch(a.id, { sort_order: b.sort_order }), patch(b.id, { sort_order: a.sort_order })]);
  };
  const remove = async (id: string, n: string) => {
    if (!confirm(`Delete “${n}”? Products in it will become uncategorised.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Category deleted");
    refresh();
  };

  const parents = data.filter((c) => !c.parent_id);
  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2 rounded-xl border bg-card p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category or subcategory name" className="max-w-xs" />
        <Select value={parent} onValueChange={setParent}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none">Top-level category</SelectItem>{parents.map((p) => <SelectItem key={p.id} value={p.id}>Under {p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="submit"><Plus /> Add</Button>
      </form>
      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : (
          <ul className="divide-y">
            {data.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <CategoryIcon name={c.icon} className="size-4 text-muted-foreground" />
                <Input defaultValue={c.name} className={`h-8 max-w-xs ${c.parent_id ? "ml-6" : ""}`} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && void patch(c.id, { name: e.target.value.trim() })} aria-label="Category name" />
                <span className="hidden text-xs text-muted-foreground md:inline">/{c.slug}</span>
                <div className="ml-auto flex items-center gap-1">
                  <label className="mr-2 flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={c.is_active} onCheckedChange={(v) => void patch(c.id, { is_active: v })} /> {c.is_active ? "Active" : "Disabled"}</label>
                  <Button variant="ghost" size="icon" onClick={() => void move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void move(i, 1)} disabled={i === data.length - 1} aria-label="Move down"><ArrowDown /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void remove(c.id, c.name)} aria-label={`Delete ${c.name}`}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
