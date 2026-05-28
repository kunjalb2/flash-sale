import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, ShoppingBag, CreditCard, Ticket, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  return (
    <Shell>
      <div className="container py-12 md:py-16 max-w-4xl">
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Help Center
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Find answers to common questions and get support
            </p>
          </div>

          <Card>
            <CardHeader>
              <HelpCircle className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-2xl">How can we help you?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Browse our frequently asked questions below or contact our support
                team for personalized assistance.
              </p>
              <Link href="/contact">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Contact Support
                </button>
              </Link>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">
              Common Questions
            </h2>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Booking Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h3 className="font-medium">How do I book a ticket?</h3>
                  <p className="text-muted-foreground mt-1">
                    Browse our events page, select the event you're interested
                    in, choose your ticket quantity, and proceed to checkout.
                    You'll receive a confirmation email with your tickets.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Can I book multiple tickets?</h3>
                  <p className="text-muted-foreground mt-1">
                    Yes, you can book multiple tickets for the same event as long
                    as tickets are available and within the purchase limit.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">How long is my reservation valid?</h3>
                  <p className="text-muted-foreground mt-1">
                    Ticket reservations are valid for 15 minutes. Complete your
                    payment within this time to secure your booking.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h3 className="font-medium">What payment methods do you accept?</h3>
                  <p className="text-muted-foreground mt-1">
                    We accept all major credit and debit cards through our secure
                    Stripe payment integration.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Is my payment information secure?</h3>
                  <p className="text-muted-foreground mt-1">
                    Absolutely. We use industry-standard encryption and PCI
                    compliant payment processing via Stripe. Your payment
                    details are never stored on our servers.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Can I get a refund?</h3>
                  <p className="text-muted-foreground mt-1">
                    Refunds are subject to the event organizer's policy. Please
                    review the event details before purchasing or contact support
                    for assistance.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  My Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h3 className="font-medium">Where are my tickets?</h3>
                  <p className="text-muted-foreground mt-1">
                    Your confirmed tickets are available in the{" "}
                    <Link href="/bookings" className="text-primary hover:underline">
                      My Bookings
                    </Link>{" "}
                    section. You can download them as PDF files from there.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">How do I access my tickets at the event?</h3>
                  <p className="text-muted-foreground mt-1">
                    Show your ticket PDF (either printed or on your mobile
                    device) at the venue entrance. Each ticket has a unique QR
                    code for verification.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h3 className="font-medium">How do I update my profile?</h3>
                  <p className="text-muted-foreground mt-1">
                    Visit the{" "}
                    <Link href="/profile" className="text-primary hover:underline">
                      Profile
                    </Link>{" "}
                    page to view and update your account information.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">What if I forget my password?</h3>
                  <p className="text-muted-foreground mt-1">
                    Click "Forgot password" on the login page and follow the
                    instructions sent to your email address to reset your
                    password.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Still need help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Can't find the answer you're looking for? Our support team is
                  here to help.
                </p>
                <Link href="/contact">
                  <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3">
                    Contact Us
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}