"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Save, Plus, Trash2, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useApiQuery } from "@/hooks/use-api";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/hooks/use-api";
import { adminService } from "@/services/admin";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Event, Ticket, TicketBatchItem } from "@/types";
import Link from "next/link";

function BatchTicketDialog({
  eventId,
  open,
  onOpenChange,
  onSuccess,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [defaultPrice, setDefaultPrice] = useState("");
  const [tickets, setTickets] = useState<TicketBatchItem[]>([
    { seat_number: "", section: "", row: "", seat_type: "general" },
  ]);

  const addRow = () => {
    setTickets([...tickets, { seat_number: "", section: "", row: "", seat_type: "general" }]);
  };

  const removeRow = (index: number) => {
    setTickets(tickets.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof TicketBatchItem, value: string) => {
    const updated = [...tickets];
    updated[index] = { ...updated[index], [field]: value };
    setTickets(updated);
  };

  const handleSubmit = async () => {
    const validTickets = tickets.filter((t) => t.seat_number.trim());
    if (validTickets.length === 0) {
      toast({ title: "Add at least one ticket", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await adminService.batchCreateTickets(eventId, {
        tickets: validTickets,
        default_price: defaultPrice ? parseFloat(defaultPrice) : undefined,
      });
      toast({ title: `Created ${validTickets.length} tickets` });
      onSuccess();
      onOpenChange(false);
      setTickets([{ seat_number: "", section: "", row: "", seat_type: "general" }]);
    } catch {
      toast({ title: "Failed to create tickets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Batch Create Tickets</DialogTitle>
          <DialogDescription>Add multiple tickets at once for this event</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Default Price (optional)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Leave empty to use event price"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tickets</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" /> Add Row
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat # *</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={ticket.seat_number}
                          onChange={(e) => updateRow(i, "seat_number", e.target.value)}
                          placeholder="A1"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={ticket.section || ""}
                          onChange={(e) => updateRow(i, "section", e.target.value)}
                          placeholder="VIP"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={ticket.row || ""}
                          onChange={(e) => updateRow(i, "row", e.target.value)}
                          placeholder="A"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={ticket.seat_type || "general"}
                          onChange={(e) => updateRow(i, "seat_type", e.target.value)}
                          placeholder="general"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        {tickets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeRow(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : `Create ${tickets.filter((t) => t.seat_number.trim()).length} Tickets`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.id as string;

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: event, isLoading, refetch: refetchEvent } = useApiQuery<Event>(
    ["admin-event", eventId],
    `/events/${eventId}`
  );

  const { data: ticketsData, refetch: refetchTickets } = useApiQuery<{
    items: Ticket[];
    total: number;
  }>(["admin-event-tickets", eventId], `/events/${eventId}/tickets?size=100`);

  const { data: bookingsData } = useApiQuery<{
    items: Array<{
      id: string;
      user_id: string;
      ticket_count: number;
      total_amount: number;
      status: string;
      created_at: string;
    }>;
    total: number;
  }>(["admin-event-bookings", eventId], `/admin/bookings?event_id=${eventId}&size=20`);

  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    event_date: "",
    sale_start_date: "",
    sale_end_date: "",
    total_tickets: "",
    price_per_ticket: "",
    image_url: "",
    is_active: true,
  });

  const enableEdit = () => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description || "",
        venue: event.venue,
        event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
        sale_start_date: event.sale_start_date ? new Date(event.sale_start_date).toISOString().slice(0, 16) : "",
        sale_end_date: event.sale_end_date ? new Date(event.sale_end_date).toISOString().slice(0, 16) : "",
        total_tickets: String(event.total_tickets),
        price_per_ticket: String(event.price_per_ticket),
        image_url: event.image_url || "",
        is_active: event.is_active,
      });
    }
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/events/${eventId}`, {
        title: form.title,
        description: form.description || null,
        venue: form.venue,
        event_date: form.event_date ? new Date(form.event_date).toISOString() : undefined,
        sale_start_date: form.sale_start_date ? new Date(form.sale_start_date).toISOString() : undefined,
        sale_end_date: form.sale_end_date ? new Date(form.sale_end_date).toISOString() : undefined,
        price_per_ticket: form.price_per_ticket ? parseFloat(form.price_per_ticket) : undefined,
        image_url: form.image_url || null,
        is_active: form.is_active,
      });
      toast({ title: "Event updated successfully" });
      setEditMode(false);
      refetchEvent();
    } catch {
      toast({ title: "Failed to update event", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteTicketId) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteTicket(deleteTicketId);
      toast({ title: "Ticket deleted" });
      refetchTickets();
      refetchEvent();
      setDeleteTicketId(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast({ title: error.response?.data?.detail || "Failed to delete ticket", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Event not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const tickets = ticketsData?.items || [];
  const bookings = bookingsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-muted-foreground mt-1">{event.venue} &middot; {formatDate(event.event_date)}</p>
          </div>
        </div>
        {!editMode && (
          <Button onClick={enableEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" /> Edit Event
          </Button>
        )}
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({bookingsData?.total || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          {editMode ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sale Start</Label>
                    <Input type="datetime-local" value={form.sale_start_date} onChange={(e) => setForm({ ...form, sale_start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sale End</Label>
                    <Input type="datetime-local" value={form.sale_end_date} onChange={(e) => setForm({ ...form, sale_end_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Per Ticket</Label>
                    <Input type="number" step="0.01" value={form.price_per_ticket} onChange={(e) => setForm({ ...form, price_per_ticket: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                    {form.image_url && (
                      <div className="mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-muted">
                        <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.is_active} onCheckedChange={(val) => setForm({ ...form, is_active: val })} />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {event.image_url && (
                  <div className="mb-6 aspect-video w-full max-w-xl overflow-hidden rounded-xl bg-muted">
                    <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{event.description || "No description"}</p></div>
                  <div><span className="text-muted-foreground">Status:</span><p className="mt-1"><StatusBadge status={event.is_active ? "active" : "inactive"} /></p></div>
                  <div><span className="text-muted-foreground">Price:</span><p className="mt-1 font-medium">{formatCurrency(event.price_per_ticket)}</p></div>
                  <div><span className="text-muted-foreground">Tickets:</span><p className="mt-1">{event.available_tickets} available / {event.total_tickets} total</p></div>
                  <div><span className="text-muted-foreground">Sale Period:</span><p className="mt-1">{formatDate(event.sale_start_date)} - {formatDate(event.sale_end_date)}</p></div>
                  <div><span className="text-muted-foreground">Created:</span><p className="mt-1">{formatDate(event.created_at)}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{tickets.length} Tickets</h3>
            <Button onClick={() => setBatchOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Tickets
            </Button>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seat</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Row</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No tickets yet. Add tickets to start selling.
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.seat_number}</TableCell>
                      <TableCell>{ticket.section || "-"}</TableCell>
                      <TableCell>{ticket.row || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{ticket.seat_type}</Badge></TableCell>
                      <TableCell>{formatCurrency(ticket.price)}</TableCell>
                      <TableCell><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell>
                        {ticket.status === "available" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTicketId(ticket.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <BatchTicketDialog
            eventId={eventId}
            open={batchOpen}
            onOpenChange={setBatchOpen}
            onSuccess={() => { refetchTickets(); refetchEvent(); }}
          />

          <ConfirmDialog
            open={!!deleteTicketId}
            onOpenChange={(open) => !open && setDeleteTicketId(null)}
            title="Delete Ticket"
            description="Are you sure you want to delete this ticket? Only available tickets can be deleted."
            confirmLabel="Delete"
            variant="destructive"
            loading={deleteLoading}
            onConfirm={handleDeleteTicket}
          />
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No bookings for this event yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}...</TableCell>
                      <TableCell>{booking.ticket_count}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(booking.total_amount)}</TableCell>
                      <TableCell><StatusBadge status={booking.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(booking.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
