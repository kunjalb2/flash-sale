"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/hooks/use-api";
import Link from "next/link";

export default function CreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.venue.trim()) errs.venue = "Venue is required";
    if (!form.event_date) errs.event_date = "Event date is required";
    if (!form.sale_start_date) errs.sale_start_date = "Sale start date is required";
    if (!form.sale_end_date) errs.sale_end_date = "Sale end date is required";
    if (!form.total_tickets || parseInt(form.total_tickets) <= 0)
      errs.total_tickets = "Must be greater than 0";
    if (!form.price_per_ticket || parseFloat(form.price_per_ticket) <= 0)
      errs.price_per_ticket = "Must be greater than 0";
    if (form.event_date && form.sale_start_date && new Date(form.sale_start_date) >= new Date(form.event_date))
      errs.sale_start_date = "Sale start must be before event date";
    if (form.sale_start_date && form.sale_end_date && new Date(form.sale_end_date) <= new Date(form.sale_start_date))
      errs.sale_end_date = "Sale end must be after sale start";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post("/events", {
        title: form.title,
        description: form.description || null,
        venue: form.venue,
        event_date: new Date(form.event_date).toISOString(),
        sale_start_date: new Date(form.sale_start_date).toISOString(),
        sale_end_date: new Date(form.sale_end_date).toISOString(),
        total_tickets: parseInt(form.total_tickets),
        price_per_ticket: parseFloat(form.price_per_ticket),
        image_url: form.image_url || null,
        is_active: form.is_active,
      });
      toast({ title: "Event created successfully" });
      router.push("/admin/events");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast({
        title: error.response?.data?.detail || "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Create Event</h1>
          <p className="text-muted-foreground mt-1">Add a new event to your platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g., Summer Music Festival 2025"
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  value={form.venue}
                  onChange={(e) => updateField("venue", e.target.value)}
                  placeholder="e.g., Madison Square Garden"
                />
                {errors.venue && <p className="text-sm text-destructive">{errors.venue}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe your event..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_date">Event Date *</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={form.event_date}
                  onChange={(e) => updateField("event_date", e.target.value)}
                />
                {errors.event_date && <p className="text-sm text-destructive">{errors.event_date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_start_date">Sale Start Date *</Label>
                <Input
                  id="sale_start_date"
                  type="datetime-local"
                  value={form.sale_start_date}
                  onChange={(e) => updateField("sale_start_date", e.target.value)}
                />
                {errors.sale_start_date && <p className="text-sm text-destructive">{errors.sale_start_date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_end_date">Sale End Date *</Label>
                <Input
                  id="sale_end_date"
                  type="datetime-local"
                  value={form.sale_end_date}
                  onChange={(e) => updateField("sale_end_date", e.target.value)}
                />
                {errors.sale_end_date && <p className="text-sm text-destructive">{errors.sale_end_date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_tickets">Total Tickets *</Label>
                <Input
                  id="total_tickets"
                  type="number"
                  min="1"
                  value={form.total_tickets}
                  onChange={(e) => updateField("total_tickets", e.target.value)}
                  placeholder="e.g., 500"
                />
                {errors.total_tickets && <p className="text-sm text-destructive">{errors.total_tickets}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_per_ticket">Price Per Ticket ($) *</Label>
                <Input
                  id="price_per_ticket"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price_per_ticket}
                  onChange={(e) => updateField("price_per_ticket", e.target.value)}
                  placeholder="e.g., 49.99"
                />
                {errors.price_per_ticket && <p className="text-sm text-destructive">{errors.price_per_ticket}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={(e) => updateField("image_url", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {form.image_url && (
                  <div className="mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-muted">
                    <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => updateField("is_active", val)}
                />
                <Label>Active (visible to users)</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/events">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
