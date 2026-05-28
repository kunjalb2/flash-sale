"use client";

import { useState, useCallback } from "react";
import { MoreHorizontal, Eye, Edit, Trash2, Shield, UserCog, Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useApiQuery } from "@/hooks/use-api";
import { useApiMutation, api } from "@/hooks/use-api";
import { useToast } from "@/components/ui/use-toast";
import { adminService } from "@/services/admin";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { AdminUser, AdminUserCreate, AdminUserCreateResponse, AdminUserDetail, Column } from "@/types";

function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (response: AdminUserCreateResponse) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !fullName) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.createUser({
        email,
        full_name: fullName,
        password: password || undefined,
        is_superuser: isSuperuser,
      });
      toast({ title: "User created successfully" });
      onSuccess(response);
      setEmail("");
      setFullName("");
      setPassword("");
      setIsSuperuser(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast({ title: error.response?.data?.detail || "Failed to create user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Add a new user to the platform</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (optional - auto-generated if empty)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for auto-generated password"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Admin Role</Label>
              <p className="text-sm text-muted-foreground">Grant admin privileges</p>
            </div>
            <Switch checked={isSuperuser} onCheckedChange={setIsSuperuser} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordGeneratedDialog({
  password,
  open,
  onOpenChange,
}: {
  password: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Generated</DialogTitle>
          <DialogDescription>Share this password with the user securely</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
            <code className="flex-1 font-mono text-sm break-all">{password}</code>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This is the only time you will see this password. Please store it securely.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Detailed information about this user</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium">{user.full_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={user.is_active ? "active" : "inactive"} />
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <StatusBadge status={user.is_superuser ? "confirmed" : "pending"} />
              <span className="ml-2 text-sm">{user.is_superuser ? "Admin" : "User"}</span>
            </div>
            <div>
              <p className="text-muted-foreground">Bookings</p>
              <p className="font-medium">{user.booking_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Spent</p>
              <p className="font-medium">{formatCurrency(user.total_spent)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{formatDate(user.created_at)}</p>
            </div>
          </div>

          {user.recent_bookings && user.recent_bookings.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Bookings</h4>
                <div className="space-y-2">
                  {user.recent_bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <div>
                        <span className="font-medium">{b.ticket_count} tickets</span>
                        <span className="text-muted-foreground ml-2">{formatCurrency(b.total_amount)}</span>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = (val: boolean) => {
    if (val && user) {
      setFullName(user.full_name);
      setIsActive(user.is_active);
      setIsSuperuser(user.is_superuser);
    }
    onOpenChange(val);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await adminService.updateUser(user.id, {
        full_name: fullName,
        is_active: isActive,
        is_superuser: isSuperuser,
      });
      toast({ title: "User updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to update user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information and permissions</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Active Status</Label>
              <p className="text-sm text-muted-foreground">Allow user to access the platform</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Admin Role</Label>
              <p className="text-sm text-muted-foreground">Grant admin privileges</p>
            </div>
            <Switch checked={isSuperuser} onCheckedChange={setIsSuperuser} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const queryParams: Record<string, string | number | boolean | undefined> = {
    page,
    size: 20,
  };
  if (search) queryParams.search = search;
  if (statusFilter !== "all") queryParams.is_active = statusFilter === "active";
  if (roleFilter !== "all") queryParams.is_superuser = roleFilter === "admin";

  const { data, isLoading, refetch } = useApiQuery<{
    items: AdminUser[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }>(["admin-users", String(page), search, statusFilter, roleFilter], `/admin/users?${new URLSearchParams(
    Object.entries(queryParams).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString()}`);

  const handleViewDetail = async (user: AdminUser) => {
    try {
      const detail = await adminService.getUser(user.id);
      setUserDetail(detail);
      setDetailOpen(true);
    } catch {
      toast({ title: "Failed to load user details", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteUser(selectedUser.id);
      toast({ title: "User deactivated successfully" });
      refetch();
      setDeleteOpen(false);
    } catch {
      toast({ title: "Failed to deactivate user", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      header: "Email",
      cell: (row) => <span className="font-medium">{row.email}</span>,
    },
    {
      key: "full_name",
      header: "Name",
      cell: (row) => row.full_name,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active ? "active" : "inactive"} />,
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        <span className="flex items-center gap-1.5">
          {row.is_superuser ? (
            <><Shield className="h-3.5 w-3.5 text-primary" /> Admin</>
          ) : (
            <><UserCog className="h-3.5 w-3.5 text-muted-foreground" /> User</>
          )}
        </span>
      ),
    },
    {
      key: "bookings",
      header: "Bookings",
      cell: (row) => row.booking_count,
      className: "text-right",
    },
    {
      key: "total_spent",
      header: "Total Spent",
      cell: (row) => formatCurrency(row.total_spent),
      className: "text-right",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetail(row)} className="cursor-pointer">
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setSelectedUser(row); setEditOpen(true); }}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setSelectedUser(row); setDeleteOpen(true); }}
              className="cursor-pointer text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and permissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        searchPlaceholder="Search by email or name..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        filters={
          <>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        isLoading={isLoading}
        emptyMessage="No users found"
        keyExtractor={(row) => row.id}
      />

      <UserDetailDialog user={userDetail} open={detailOpen} onOpenChange={setDetailOpen} />

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(response) => {
          refetch();
          if (response.generated_password) {
            setGeneratedPassword(response.generated_password);
            setPasswordDialogOpen(true);
          }
        }}
      />

      <PasswordGeneratedDialog
        password={generatedPassword}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />

      <EditUserDialog
        user={selectedUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={refetch}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Deactivate User"
        description="Are you sure you want to deactivate this user? They will lose access to the platform."
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
