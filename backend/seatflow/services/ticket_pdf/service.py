from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from seatflow.db.models.booking import Booking
from seatflow.db.models.event import Event


class TicketPDFService:
    def __init__(self):
        self.ticket_width = 80 * mm
        self.ticket_height = 40 * mm

    def generate_ticket_pdf(
        self,
        booking: Booking,
        event: Event,
    ) -> BytesIO:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        x_margin = 20 * mm
        y_margin = 20 * mm
        ticket_gap = 10 * mm

        ticket_count = booking.ticket_count

        for i in range(ticket_count):
            tickets_per_row = 2
            row = i // tickets_per_row
            col = i % tickets_per_row

            x = x_margin + col * (self.ticket_width + ticket_gap)
            y = height - y_margin - (row + 1) * (self.ticket_height + ticket_gap)

            self._draw_ticket(c, x, y, booking, event, i + 1)

        c.save()
        buffer.seek(0)
        return buffer

    def _draw_ticket(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        booking: Booking,
        event: Event,
        ticket_number: int,
    ) -> None:
        c.saveState()
        c.translate(x, y)

        border_color = colors.HexColor("#6366f1")
        c.setStrokeColor(border_color)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, self.ticket_width, self.ticket_height, 4 * mm, stroke=1, fill=0)

        header_y = self.ticket_height - 8 * mm
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.drawString(4 * mm, header_y, "SeatFlow Ticket")

        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(self.ticket_width - 20 * mm, header_y, event.title[:20])

        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(0.5)
        c.line(2 * mm, header_y - 2 * mm, self.ticket_width - 2 * mm, header_y - 2 * mm)

        info_y = header_y - 6 * mm
        line_height = 4 * mm

        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(4 * mm, info_y, "Event:")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor("#1e293b"))
        self._draw_text_wrapped(c, 20 * mm, info_y, event.title, self.ticket_width - 24 * mm)

        info_y -= line_height
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(4 * mm, info_y, "Date:")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor("#1e293b"))
        event_date = event.event_date.strftime("%B %d, %Y at %I:%M %p")
        c.drawString(20 * mm, info_y, event_date)

        info_y -= line_height
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(4 * mm, info_y, "Venue:")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.drawString(20 * mm, info_y, event.venue)

        info_y -= line_height
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(4 * mm, info_y, "Ticket #")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.drawString(20 * mm, info_y, f"{ticket_number} of {booking.ticket_count}")

        c.setFillColor(border_color)
        c.roundRect(4 * mm, 4 * mm, self.ticket_width - 8 * mm, 8 * mm, 2 * mm, stroke=1, fill=1)

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        booking_id_short = str(booking.id)[:8]
        c.drawString(
            self.ticket_width / 2 - 10 * mm,
            6 * mm,
            f"ID: {booking_id_short.upper()}",
        )

        c.restoreState()

    def _draw_text_wrapped(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        text: str,
        max_width: float,
        font: str = "Helvetica-Bold",
        font_size: int = 8,
    ) -> None:
        c.setFont(font, font_size)
        text_width = pdfmetrics.stringWidth(text, font, font_size)

        if text_width <= max_width:
            c.drawString(x, y, text)
        else:
            avg_char_width = text_width / len(text)
            max_chars = int(max_width / avg_char_width) - 2
            truncated = text[:max_chars] + ".."
            c.drawString(x, y, truncated)
