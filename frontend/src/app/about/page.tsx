import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, Target, Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <Shell>
      <div className="container py-12 md:py-16 max-w-5xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              About SeatFlow
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your gateway to premium live experiences. We're redefining how
              you discover, book, and enjoy events.
            </p>
          </div>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">
                At SeatFlow, we believe everyone deserves seamless access to
                the events that matter most. From concerts to sports, theater
                to comedy, we're building the most intuitive and reliable
                ticketing platform for the modern era. Our mission is to
                connect fans with unforgettable experiences through technology
                that puts you first.
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Award className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-xl">Premium Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We curate high-quality events from trusted organizers,
                  ensuring every ticket purchase leads to an exceptional
                  experience. From intimate venues to grand arenas, we bring
                  you the best.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-xl">Secure & Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your security is our priority. With enterprise-grade
                  encryption, secure payment processing, and real-time
                  booking confirmation, you can book with complete peace of
                  mind.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-xl">Customer First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our dedicated support team is available around the clock to
                  assist you. Whether you have questions about an event or need
                  help with your booking, we're here for you.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-xl">Fair Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We believe in transparent pricing with no hidden fees. What
                  you see is what you pay. Our flash-sale model means you get
                  exclusive deals on premium events.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border-t pt-8">
            <h2 className="font-display text-2xl font-semibold mb-4">
              The SeatFlow Difference
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Built as a scalable distributed system learning project,
                SeatFlow demonstrates modern software architecture principles
                including microservices, event-driven communication, and
                real-time inventory management. Our platform uses cutting-edge
                technology to deliver a smooth, responsive booking experience
                even during high-demand events.
              </p>
              <p>
                SeatFlow is designed to handle thousands of concurrent users,
                ensuring you never miss out on your favorite events due to
                technical issues. Our robust backend and intuitive frontend work
                together seamlessly to provide a premium user experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}