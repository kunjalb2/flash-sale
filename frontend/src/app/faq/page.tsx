"use client";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  CreditCard,
  Ticket,
  User,
  Shield,
  Clock,
  Gift,
  AlertCircle,
} from "lucide-react";

export default function FAQPage() {
  return (
    <Shell>
      <div className="container py-12 md:py-16 max-w-4xl">
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Everything you need to know about SeatFlow
            </p>
          </div>

          <Card>
            <CardHeader>
              <BookOpen className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    What is SeatFlow and how does it work?
                  </AccordionTrigger>
                  <AccordionContent>
                    SeatFlow is a premium ticket booking platform for live
                    events. Browse our curated selection of events, select your
                    preferred show, choose the number of tickets, and complete
                    secure payment. You'll receive instant confirmation and
                    downloadable PDF tickets.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    Do I need to create an account to book tickets?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes, creating an account is required to make bookings. This
                    helps us keep track of your orders, provide easy access to
                    your tickets, and offer personalized recommendations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    How do I find events near me?
                  </AccordionTrigger>
                  <AccordionContent>
                    Visit our Events page to browse all available events. You
                    can filter by category, date, or venue to find exactly what
                    you're looking for.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Ticket className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Tickets & Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    How do I download my tickets?
                  </AccordionTrigger>
                  <AccordionContent>
                    Once your booking is confirmed, you can download your
                    tickets from the My Bookings page. Simply click the
                    "Tickets" button next to your booking to download the PDF.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    Can I book tickets for multiple people?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes! You can purchase multiple tickets for the same event.
                    Each ticket will have its own unique QR code and can be
                    shared with different people.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger>
                    What happens if an event is cancelled?
                  </AccordionTrigger>
                  <AccordionContent>
                    If an event is cancelled by the organizer, you'll receive a
                    full refund to your original payment method. We'll notify
                    you via email when the refund is processed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-7">
                  <AccordionTrigger>
                    Can I transfer my tickets to someone else?
                  </AccordionTrigger>
                  <AccordionContent>
                    Tickets are non-transferable and linked to your account.
                    If you can no longer attend, you may be able to cancel your
                    booking depending on the event's cancellation policy.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Payment & Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-8">
                  <AccordionTrigger>
                    What payment methods do you accept?
                  </AccordionTrigger>
                  <AccordionContent>
                    We accept all major credit and debit cards including Visa,
                    MasterCard, American Express, and Discover. Payments are
                    processed securely through Stripe.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-9">
                  <AccordionTrigger>
                    Are there any hidden fees?
                  </AccordionTrigger>
                  <AccordionContent>
                    No! We believe in transparent pricing. The price you see on
                    the event page is the final price you pay. There are no
                    service fees, booking fees, or hidden charges.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-10">
                  <AccordionTrigger>
                    How long do I have to complete my payment?
                  </AccordionTrigger>
                  <AccordionContent>
                    Ticket reservations are held for 15 minutes from the time
                    you select your tickets. You must complete payment within
                    this window to secure your booking.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-11">
                  <AccordionTrigger>
                    Can I get a refund?
                  </AccordionTrigger>
                  <AccordionContent>
                    Refund policies vary by event. Please review the specific
                    event's cancellation policy before purchasing. For
                    assistance with refunds, contact our support team.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Flash Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-12">
                  <AccordionTrigger>
                    What are flash sales?
                  </AccordionTrigger>
                  <AccordionContent>
                    Flash sales are limited-time events where premium tickets are
                    offered at discounted prices. These sales happen for a
                    short duration and have limited availability, so act fast!
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-13">
                  <AccordionTrigger>
                    How do I know about upcoming flash sales?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sign up for our newsletter and follow us on social media to
                    get notified about upcoming flash sales. You can also check
                    the Events page regularly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-14">
                  <AccordionTrigger>
                    Are flash sale tickets different from regular tickets?
                  </AccordionTrigger>
                  <AccordionContent>
                    No! Flash sale tickets provide the same experience as
                    regular tickets – same seats, same access, same event. You
                    just get them at a better price!
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Security & Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-15">
                  <AccordionTrigger>
                    Is my payment information secure?
                  </AccordionTrigger>
                  <AccordionContent>
                    Absolutely. We use industry-standard SSL encryption and PCI
                    compliant payment processing through Stripe. Your payment
                    details are never stored on our servers.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-16">
                  <AccordionTrigger>
                    How do you protect my personal data?
                  </AccordionTrigger>
                  <AccordionContent>
                    We're committed to protecting your privacy. Your personal
                    information is encrypted and stored securely. We never sell
                    your data to third parties. See our Privacy Policy for more
                    details.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-17">
                  <AccordionTrigger>
                    Are tickets secure from fraud?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes, each ticket includes a unique QR code that can only be
                    used once. This prevents ticket duplication and ensures that
                    only the rightful holder can access the event.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <User className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Account Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-18">
                  <AccordionTrigger>
                    How do I reset my password?
                  </AccordionTrigger>
                  <AccordionContent>
                    Click "Forgot password" on the login page, enter your email
                    address, and we'll send you a password reset link. Follow
                    the instructions to create a new password.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-19">
                  <AccordionTrigger>
                    Can I delete my account?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes, you can request account deletion from your profile page
                    or by contacting our support team. Please note that this
                    action is irreversible and you'll lose access to your
                    booking history.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-20">
                  <AccordionTrigger>
                    How do I update my email address?
                  </AccordionTrigger>
                  <AccordionContent>
                    You can update your email address from the Profile page.
                    We'll send a verification link to your new email for
                    confirmation.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Still have questions?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Can't find the answer you're looking for? Our support team is
                    here to help you.
                  </p>
                  <div className="flex gap-2">
                    <a href="/help">
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                        Help Center
                      </button>
                    </a>
                    <a href="/contact">
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3">
                        Contact Us
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}