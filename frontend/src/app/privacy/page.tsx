import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Lock, User, Database } from "lucide-react";

export default function PrivacyPage() {
  return (
    <Shell>
      <div className="container py-12 md:py-16 max-w-4xl">
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                At SeatFlow, we take your privacy seriously. This Privacy
                Policy explains how we collect, use, and protect your personal
                information when you use our platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Eye className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <p className="text-sm text-muted-foreground">
                  When you create an account, we collect your name, email
                  address, and password. This information is necessary to
                  create and manage your account.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Booking Information</h3>
                <p className="text-sm text-muted-foreground">
                  We collect information about your bookings, including event
                  details, ticket quantities, and payment information. This
                  helps us process your orders and provide better service.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Payment Information</h3>
                <p className="text-sm text-muted-foreground">
                  Payment information is processed securely through Stripe. We
                  do not store your full credit card number or CVV on our
                  servers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Data</h3>
                <p className="text-sm text-muted-foreground">
                  We collect information about how you use our platform,
                  including pages visited, features used, and time spent. This
                  helps us improve our services and user experience.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <User className="h-6 w-6 text-primary mb-2" />
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Process and fulfill your bookings and send confirmations
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Provide customer support and respond to your inquiries
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Send important updates about your bookings and events
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Improve our platform and develop new features
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Ensure security and prevent fraud on our platform
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Comply with legal obligations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We implement industry-standard security measures to protect
                your information:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    SSL/TLS encryption for all data in transit
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Secure password hashing using bcrypt
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    PCI DSS compliant payment processing via Stripe
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Regular security audits and penetration testing
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Access controls and authentication for our systems
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Provide our services to you</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Comply with legal requirements</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Resolve disputes and enforce our agreements</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You can request deletion of your account and personal data at
                any time through your profile settings or by contacting our
                support team.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Access:</strong> Request a copy of your personal data
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Correction:</strong> Update inaccurate or incomplete
                    data
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Deletion:</strong> Request deletion of your personal
                    data
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Objection:</strong> Object to processing of your
                    data
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Portability:</strong> Request transfer of your data
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                We use the following third-party services to provide our
                platform:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Stripe:</strong> Secure payment processing
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>PostgreSQL:</strong> Database hosting
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Redis:</strong> Caching and session management
                  </span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                These services have their own privacy policies, and we encourage
                you to review them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our platform is not intended for children under the age of 13.
                We do not knowingly collect personal information from children.
                If we become aware that we have collected personal information
                from a child under 13, we will take steps to delete it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new policy on
                our website and updating the "Last updated" date above. We
                encourage you to review this policy periodically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                If you have any questions about this Privacy Policy or our data
                practices, please contact us:
              </p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  privacy@seatflow.com
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