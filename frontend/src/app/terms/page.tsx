import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Gavel,
  ShieldCheck,
} from "lucide-react";

export default function TermsPage() {
  return (
    <Shell>
      <div className="container py-12 md:py-16 max-w-4xl">
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Welcome to SeatFlow. By using our platform, you agree to these
                Terms of Service. Please read them carefully.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                By accessing or using SeatFlow, you agree to be bound by these
                Terms of Service and all applicable laws and regulations. If you
                do not agree with any of these terms, you are prohibited from
                using this platform.
              </p>
              <p className="text-sm text-muted-foreground">
                SeatFlow reserves the right to modify these terms at any time.
                Continued use of the platform after changes constitutes acceptance
                of the updated terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-6 w-6 text-primary mb-2" />
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Creation</h3>
                <p className="text-sm text-muted-foreground">
                  To use certain features, you must create an account. You are
                  responsible for maintaining the confidentiality of your account
                  credentials and for all activities under your account.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <p className="text-sm text-muted-foreground">
                  You agree to provide accurate, current, and complete
                  information during registration and to update such information
                  to keep it accurate, current, and complete.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Termination</h3>
                <p className="text-sm text-muted-foreground">
                  We reserve the right to suspend or terminate your account at
                  any time for violation of these terms, fraudulent activity, or
                  any other reason at our sole discretion.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Booking and Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Ticket Availability</h3>
                <p className="text-sm text-muted-foreground">
                  All ticket sales are subject to availability and are made on a
                  first-come, first-served basis. We cannot guarantee
                  availability of any specific ticket or seat.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  All prices are displayed in USD and are final. Ticket prices
                  may vary based on demand, timing, and other factors. Flash
                  sale prices are limited-time offers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Payment must be made at the time of booking. Bookings are not
                  confirmed until payment is successfully processed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ticket Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Electronic tickets will be delivered via email and available
                  for download from your account. You are responsible for
                  ensuring you have access to your tickets before the event.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Non-Transferable</h3>
                <p className="text-sm text-muted-foreground">
                  Tickets are non-transferable and may not be resold for
                  commercial purposes unless authorized by SeatFlow.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <AlertTriangle className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Cancellations and Refunds</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Cancellation and refund policies vary by event and are determined
                by the event organizer. Please review the specific event's
                policy before purchasing.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    If an event is cancelled by the organizer, you will receive
                    a full refund
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Refunds for cancelled events are processed to the original
                    payment method
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Processing time for refunds may vary depending on your bank
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Certain events may have no-returns or strict cancellation
                    policies
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Gavel className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Event Participation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Code of Conduct</h3>
                <p className="text-sm text-muted-foreground">
                  By attending events through SeatFlow, you agree to conduct
                  yourself appropriately and respect all attendees, performers,
                  and venue staff. Disruptive or inappropriate behavior may
                  result in removal from the venue without refund.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Age Restrictions</h3>
                <p className="text-sm text-muted-foreground">
                  Some events may have age restrictions. It is your
                  responsibility to verify age requirements before purchasing.
                  Valid ID may be required at the venue entrance.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Venue Rules</h3>
                <p className="text-sm text-muted-foreground">
                  You must comply with all venue rules and regulations,
                  including but not limited to bag policies, prohibited items,
                  and photography restrictions. Violation may result in denial
                  of entry or removal.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                All content on SeatFlow, including but not limited to text,
                graphics, logos, images, and software, is the property of
                SeatFlow or its licensors and is protected by intellectual
                property laws.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    You may not reproduce, modify, distribute, or create
                    derivative works without express permission
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Event names, performer names, and related trademarks are
                    property of their respective owners
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Unauthorized recording or photography at events is prohibited
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <AlertTriangle className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To the fullest extent permitted by law, SeatFlow shall not be
                liable for any indirect, incidental, special, consequential,
                or punitive damages, including but not limited to lost profits,
                data loss, or personal injury, arising from your use of the
                platform.
              </p>
              <p className="text-sm text-muted-foreground">
                SeatFlow is not responsible for events cancelled or rescheduled
                by organizers, venue issues, or circumstances beyond our
                control.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Gavel className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Indemnification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You agree to indemnify and hold harmless SeatFlow, its officers,
                directors, employees, and affiliates from any claims, damages,
                losses, liabilities, and expenses arising from your use of the
                platform or violation of these Terms of Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                These Terms of Service shall be governed by and construed in
                accordance with the laws of the State of California, without
                regard to its conflict of law provisions. Any disputes arising
                under these terms shall be resolved in the courts of California.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Severability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If any provision of these Terms of Service is found to be
                invalid or unenforceable, the remaining provisions shall remain
                in full force and effect. The invalid provision shall be replaced
                with a valid provision that most closely reflects the original
                intent.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                If you have any questions about these Terms of Service, please
                contact us:
              </p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  legal@seatflow.com
                </p>
                <p>
                  <span className="font-medium">Address:</span> 123 Event Street,
                  San Francisco, CA 94102
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}