import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

class PdfService:
    @staticmethod
    def render_to_pdf(template_path: str, context: dict) -> bytes:
        """
        Renders a Jinja2 template with the given context and compiles it into PDF bytes.
        Does NOT perform any database queries.
        
        Args:
            template_path: Path to the template relative to backend/app/templates/pdf/
                           (e.g., 'reports/stock.html' or 'transactions/stock_in.html')
            context: Dictionary of values to render the template with.
        """
        templates_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "templates", 
            "pdf"
        )
        env = Environment(loader=FileSystemLoader(templates_dir))
        template = env.get_template(template_path)
        html_content = template.render(context)
        
        # Compile HTML string to PDF bytes using WeasyPrint
        html = HTML(string=html_content)
        return html.write_pdf()
