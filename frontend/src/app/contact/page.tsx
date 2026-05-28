import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  return (
    <Shell>
      <div className="container py-12 md:py-16 max-w-5xl">
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Get in touch with our team for any questions or support
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <Mail className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Email Us</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Send us an email and we'll respond within 24 hours.
                </p>
                <a
                  href="mailto:support@seatflow.com"
                  className="text-sm text-primary hover:underline"
                >
                  support@seatflow.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Phone className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Call Us</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Our support team is available Monday to Friday, 9 AM - 6 PM.
                </p>
                <a
                  href="tel:+1234567890"
                  className="text-sm text-primary hover:underline"
                >
                  +1 (234) 567-890
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <MapPin className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Visit Us</h3>
                <p className="text-sm text-muted-foreground">
                  123 Event Street
                  <br />
                  San Francisco, CA 94102
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you shortly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="How can we help?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={5}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href="/help"
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    → Booking and reservations
                  </a>
                  <a
                    href="/help"
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    → Payment and refunds
                  </a>
                  <a
                    href="/help"
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    → Account management
                  </a>
                  <a
                    href="/help"
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    → Technical issues
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Support Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium">Monday - Friday:</span> 9:00 AM
                    - 6:00 PM (PST)
                  </p>
                  <p>
                    <span className="font-medium">Saturday - Sunday:</span> 10:00
                    AM - 4:00 PM (PST)
                  </p>
                  <p className="text-xs mt-3">
                    Response time may vary during peak periods. Urgent
                    inquiries are prioritized.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    For urgent issues related to upcoming events (within 24
                    hours), please call our emergency line.
                  </p>
                  <a
                    href="tel:+1234567899"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                  >
                    Emergency: +1 (234) 567-899
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}