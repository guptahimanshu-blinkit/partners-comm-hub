import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Truck, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor-delivery-profiles")({
  head: () => ({
    meta: [{ title: "Vendor Delivery Profiles — PartnersBiz Comms Centre" }],
  }),
  component: VendorDeliveryProfilesPage,
});

type DeliveryProfile = "Tech Enabled" | "Low Tech";

interface VendorProfile {
  id: string;
  name: string;
  tenant: string;
  profile: DeliveryProfile;
  language: string;
}

const SEED: VendorProfile[] = [
  {
    id: "v1",
    name: "ITC Limited",
    tenant: "Blinkit",
    profile: "Tech Enabled",
    language: "English",
  },
  {
    id: "v2",
    name: "Hindustan Unilever",
    tenant: "Blinkit",
    profile: "Tech Enabled",
    language: "English",
  },
  {
    id: "v3",
    name: "Anand Dairy (small scale dairy vendor)",
    tenant: "Blinkit",
    profile: "Low Tech",
    language: "Hindi",
  },
  {
    id: "v4",
    name: "Sri Krishna Traders",
    tenant: "Blinkit",
    profile: "Low Tech",
    language: "Tamil",
  },
  {
    id: "v5",
    name: "FreshLeaf Farms",
    tenant: "Blinkit",
    profile: "Tech Enabled",
    language: "Marathi",
  },
];

function VendorDeliveryProfilesPage() {
  const { role } = useRole();
  const [rows, setRows] = useState<VendorProfile[]>(SEED);
  const [editing, setEditing] = useState<VendorProfile | null>(null);
  const [draft, setDraft] = useState<DeliveryProfile>("Tech Enabled");

  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  const openEdit = (row: VendorProfile) => {
    setEditing(row);
    setDraft(row.profile);
  };

  const save = () => {
    if (!editing) return;
    setRows((prev) =>
      prev.map((r) => (r.id === editing.id ? { ...r, profile: draft } : r)),
    );
    toast.success(`${editing.name} set to ${draft}`);
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Vendor Delivery Profiles
            </h1>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Low Tech vendors automatically receive WhatsApp delivery alongside their
            category&apos;s normal channels, this is set here once per vendor, not chosen
            per template.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Delivery Profile</TableHead>
                <TableHead>Preferred Language</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.tenant}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-medium",
                        row.profile === "Low Tech"
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                          : "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
                      )}
                    >
                      {row.profile}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.language}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(row)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Delivery Profile</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vendor
                </div>
                <div className="text-sm font-medium">{editing.name}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Delivery Profile</label>
                <Select
                  value={draft}
                  onValueChange={(v) => setDraft(v as DeliveryProfile)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tech Enabled">Tech Enabled</SelectItem>
                    <SelectItem value="Low Tech">Low Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
