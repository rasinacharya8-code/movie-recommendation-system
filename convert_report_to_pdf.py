import markdown
from xhtml2pdf import pisa
import os

# Define paths
artifact_path = r'C:\Users\rasin\.gemini\antigravity\brain\26a4f407-88ac-404c-bc01-83d5d1799419\project_report.md'
output_pdf_path = 'Movie_Recommendation_System_Report.pdf'

print(f"Reading report from: {artifact_path}")

try:
    # Read MD
    with open(artifact_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Convert to HTML
    html_content = markdown.markdown(text, extensions=['extra', 'codehilite'])

    # Add styling for PDF
    full_html = f"""
    <html>
    <head>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
            @frame footer_frame {{
                -pdf-frame-content: footerContent;
                bottom: 1cm;
                margin-left: 2cm;
                margin-right: 2cm;
                height: 1cm;
            }}
        }}
        body {{ 
            font-family: Helvetica, sans-serif; 
            font-size: 11pt; 
            line-height: 1.6; 
            color: #333;
        }}
        h1 {{ 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px; 
            margin-top: 30px;
            font-size: 24pt;
        }}
        h2 {{ 
            color: #2980b9; 
            margin-top: 25px; 
            border-bottom: 1px solid #eee; 
            font-size: 18pt;
        }}
        h3 {{ 
            color: #7f8c8d; 
            margin-top: 20px; 
            font-size: 14pt;
        }}
        p {{ margin-bottom: 10px; text-align: justify; }}
        code {{ 
            background-color: #f0f0f0; 
            font-family: Courier; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-size: 10pt;
        }}
        pre {{ 
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            border: 1px solid #e1e4e8; 
            font-family: Courier;
            font-size: 9pt;
            white-space: pre-wrap;
            margin-bottom: 20px;
        }}
        li {{ margin-bottom: 5px; }}
        .footer {{ text-align: center; color: #7f8c8d; font-size: 9pt; }}
    </style>
    </head>
    <body>
    {html_content}
    <div id="footerContent" class="footer">
        Generated for BITM 7th Semester Project Submission
    </div>
    </body>
    </html>
    """

    # Save as PDF
    with open(output_pdf_path, "w+b") as result_file:
        pisa_status = pisa.CreatePDF(full_html, dest=result_file)

    if pisa_status.err:
        print("❌ Error generating PDF")
    else:
        print(f"✅ PDF generated successfully: {os.path.abspath(output_pdf_path)}")

except Exception as e:
    print(f"❌ Failed: {e}")
