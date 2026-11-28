"""Generate a small synthetic Office document with a table and external relationships."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys
from xml.sax.saxutils import escape

destination = Path(sys.argv[1])
destination.parent.mkdir(parents=True, exist_ok=True)
def paragraph(text):
    return '<w:p><w:r><w:t>'+escape(text)+'</w:t></w:r></w:p>'
def row(*values):
    return '<w:tr>'+''.join('<w:tc>'+paragraph(value)+'</w:tc>' for value in values)+'</w:tr>'
table = '<w:tbl>'+row('Ćwiczenie','Serie','Powtórzenia')+row('Bench press','3','10')+'</w:tbl>'
document = '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'''+paragraph('TRENING 1')+table+'''<w:p><w:hyperlink r:id="rLink"><w:r><w:t>Documentation link</w:t></w:r></w:hyperlink></w:p><w:p><w:r><w:drawing><wp:inline><wp:extent cx="9525" cy="9525"/><wp:docPr id="1" name="Linked fixture"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="Fixture"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:link="rImage"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9525" cy="9525"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:body></w:document>'''
with ZipFile(destination,'w',ZIP_DEFLATED) as archive:
    archive.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    archive.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    archive.writestr('word/document.xml',document)
    archive.writestr('word/_rels/document.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/fixture-link" TargetMode="External"/><Relationship Id="rImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.invalid/fixture-image.png" TargetMode="External"/></Relationships>')
