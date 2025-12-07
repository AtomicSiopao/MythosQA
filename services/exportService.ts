
import { TestPlan, TestSuite, TestCase, TestPriority } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';

// --- PDF Export ---
export const exportToPdf = (plan: TestPlan) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let cursorY = 20;

  const addNewPageIfNeeded = (heightNeeded: number) => {
    if (cursorY + heightNeeded > pageHeight - 20) {
      doc.addPage();
      cursorY = 20;
    }
  };

  const printHeading = (text: string, size: number = 16) => {
    addNewPageIfNeeded(15);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text(text, 14, cursorY);
    cursorY += (size / 2) + 4;
  };

  const printParagraph = (text: string, size: number = 10, color: number = 60) => {
    if (!text) return;
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(color);
    const splitText = doc.splitTextToSize(text, pageWidth - 28);
    addNewPageIfNeeded(splitText.length * 5);
    doc.text(splitText, 14, cursorY);
    cursorY += (splitText.length * 5) + 5;
  };

  const getPriorityColor = (p: TestPriority) => {
    switch (p) {
      case TestPriority.CRITICAL: return [220, 38, 38]; // Red 600
      case TestPriority.HIGH: return [234, 88, 12]; // Orange 600
      case TestPriority.MEDIUM: return [37, 99, 235]; // Blue 600
      case TestPriority.LOW: return [100, 116, 139]; // Slate 500
      default: return [156, 163, 175];
    }
  };

  // --- Title Page ---
  doc.setFontSize(26);
  doc.setTextColor(0);
  doc.text("Test Plan Specification", 14, cursorY);
  cursorY += 15;
  
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text(`Target URL: ${plan.websiteUrl}`, 14, cursorY);
  cursorY += 8;
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 14, cursorY);
  cursorY += 20;

  // --- Executive Summary & Strategy ---
  printHeading("1. Executive Summary & Strategy");
  printParagraph(plan.summary);
  
  if (plan.testStrategy) {
    printHeading("2. Test Strategy", 14);
    printParagraph(plan.testStrategy);
  }

  if (plan.scope) {
    printHeading("3. Scope", 14);
    printParagraph(plan.scope);
  }

  if (plan.risks) {
    printHeading("4. Risks", 14);
    printParagraph(plan.risks);
  }
  
  if (plan.tools) {
    printHeading("5. Tools", 14);
    printParagraph(plan.tools);
  }

  // --- Test Suites Detail ---
  plan.suites.forEach((suite, sIdx) => {
    doc.addPage();
    cursorY = 20;
    
    printHeading(`Suite ${sIdx + 1}: ${suite.suiteName}`, 18);
    printParagraph(suite.description);
    
    if (suite.testDataObservations) {
      addNewPageIfNeeded(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.text(`Data Observations: ${suite.testDataObservations}`, 14, cursorY);
      cursorY += 10;
    }

    // --- Test Cases within Suite ---
    suite.cases.forEach((tc, cIdx) => {
      addNewPageIfNeeded(60); // Ensure header + meta doesn't break awkwardly
      cursorY += 5;
      
      // Header
      doc.setFillColor(240, 240, 240);
      doc.rect(14, cursorY - 5, pageWidth - 28, 10, 'F');
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(`${tc.id}: ${tc.title}`, 16, cursorY + 1.5);
      cursorY += 10;

      // Metadata Row
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      
      // Draw Color Badge for Priority
      const pColor = getPriorityColor(tc.priority);
      doc.setFillColor(pColor[0], pColor[1], pColor[2]);
      doc.rect(14, cursorY - 3, 3, 3, 'F');
      doc.text(`Priority: ${tc.priority}`, 18, cursorY);
      
      doc.text(` |  Type: ${tc.type}  |  Scenario: ${tc.scenarioType || 'N/A'}`, 18 + doc.getTextWidth(`Priority: ${tc.priority}`), cursorY);
      cursorY += 8;

      // Description & Preconditions
      doc.setFont("helvetica", "bold");
      doc.text("Description:", 14, cursorY);
      cursorY += 5;
      printParagraph(tc.description);

      if (tc.preconditions) {
        doc.setFont("helvetica", "bold");
        doc.text("Preconditions:", 14, cursorY);
        cursorY += 5;
        printParagraph(tc.preconditions);
      }

      if (tc.testData && tc.testData.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Test Data:", 14, cursorY);
        cursorY += 5;
        const dataStr = tc.testData.map(d => `${d.key}: ${d.value}`).join('; ');
        printParagraph(dataStr);
      }

      // Steps Table
      if (tc.steps && tc.steps.length > 0) {
        const tableBody = tc.steps.map(s => [s.stepNumber, s.action, s.expected]);
        
        autoTable(doc, {
          startY: cursorY,
          head: [['#', 'Action', 'Expected Result']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' }
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data: any) => {
            cursorY = data.cursor.y + 10;
          }
        });
        
        // Update cursor after table
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      } else {
        cursorY += 10;
      }
    });
  });

  doc.save('MythosQA_TestSpec.pdf');
};

// --- Excel Export ---
export const exportToExcel = (plan: TestPlan) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overviewData = [
    ["Test Plan Report"],
    ["Target URL", plan.websiteUrl],
    ["Date", new Date().toLocaleDateString()],
    [""],
    ["Executive Summary"],
    [plan.summary],
    [""],
    ["Strategy"],
    [plan.testStrategy || ''],
    [""],
    ["Scope"],
    [plan.scope || ''],
    [""],
    ["Grounding Sources"],
    ...(plan.groundingSources?.map(s => [s.title, s.uri]) || [])
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

  // Sheet 2: Test Cases
  const casesData = [
    ["Suite", "ID", "Priority", "Type", "Title", "Description", "Preconditions", "Test Data", "Step #", "Action", "Expected"]
  ];

  plan.suites.forEach(suite => {
    suite.cases.forEach(tc => {
      // Format test data
      const dataStr = tc.testData?.map(d => `${d.key}: ${d.value}`).join('; ') || '';
      
      if (tc.steps.length === 0) {
         casesData.push([
           suite.suiteName, tc.id, tc.priority, tc.type, tc.title, tc.description, tc.preconditions || '', dataStr, '', '', ''
         ]);
      } else {
        tc.steps.forEach(step => {
          casesData.push([
            suite.suiteName, tc.id, tc.priority, tc.type, tc.title, tc.description, tc.preconditions || '', dataStr, 
            step.stepNumber.toString(), step.action, step.expected
          ]);
        });
      }
    });
  });

  const wsCases = XLSX.utils.aoa_to_sheet(casesData);
  XLSX.utils.book_append_sheet(wb, wsCases, "Test Cases");

  XLSX.writeFile(wb, "MythosQA_Data.xlsx");
};

// --- CSV Export ---
export const exportToCsv = (plan: TestPlan) => {
  // Helper to escape CSV fields
  const escape = (str: string | undefined) => {
    if (!str) return '""';
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows: string[] = [];

  // Metadata Section (Prepend to CSV)
  rows.push(`"Report Generated","${new Date().toLocaleDateString()}"`);
  rows.push(`"Target URL",${escape(plan.websiteUrl)}`);
  rows.push(`"Test Strategy",${escape(plan.testStrategy)}`);
  rows.push(`"Scope",${escape(plan.scope)}`);
  rows.push(`"Risks",${escape(plan.risks)}`);
  rows.push(`"Tools",${escape(plan.tools)}`);
  rows.push(""); // Empty line separator
  
  // Header Row
  rows.push('"Suite Name","Case ID","Priority","Type","Scenario","Title","Description","Preconditions","Test Data","Step Number","Action","Expected Result"');

  plan.suites.forEach(suite => {
    suite.cases.forEach(tc => {
      const dataStr = tc.testData?.map(d => `${d.key}=${d.value}`).join(' | ') || '';

      if (tc.steps.length === 0) {
        rows.push([
          escape(suite.suiteName),
          escape(tc.id),
          escape(tc.priority),
          escape(tc.type),
          escape(tc.scenarioType),
          escape(tc.title),
          escape(tc.description),
          escape(tc.preconditions),
          escape(dataStr),
          '',
          '',
          ''
        ].join(","));
      } else {
        tc.steps.forEach(step => {
          rows.push([
            escape(suite.suiteName),
            escape(tc.id),
            escape(tc.priority),
            escape(tc.type),
            escape(tc.scenarioType),
            escape(tc.title),
            escape(tc.description),
            escape(tc.preconditions),
            escape(dataStr),
            escape(step.stepNumber.toString()),
            escape(step.action),
            escape(step.expected)
          ].join(","));
        });
      }
    });
  });

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "MythosQA_Data.csv");
};

// --- DOCX Export ---
export const exportToDocx = async (plan: TestPlan) => {
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: "Test Plan Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Target URL: ", bold: true }),
        new TextRun(plan.websiteUrl),
      ],
      spacing: { after: 100 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Date: ", bold: true }),
        new TextRun(new Date().toLocaleDateString()),
      ],
      spacing: { after: 400 }
    })
  );

  // Executive Summary
  if (plan.summary) {
    children.push(
      new Paragraph({
        text: "Executive Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );
    children.push(
      new Paragraph({
        text: plan.summary,
        spacing: { after: 400 }
      })
    );
  }

  // Suites
  for (const suite of plan.suites) {
    children.push(
      new Paragraph({
        text: `Suite: ${suite.suiteName}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );
    children.push(
      new Paragraph({
        text: suite.description,
        italics: true,
        spacing: { after: 300 }
      })
    );

    for (const tc of suite.cases) {
       children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${tc.id}: ${tc.title}`, bold: true, size: 24 }),
          ],
          spacing: { before: 200, after: 100 }
        })
      );
      
      const metaText = `Priority: ${tc.priority} | Type: ${tc.type}`;
      children.push(new Paragraph({ text: metaText, color: "666666", spacing: { after: 100 } }));
      children.push(new Paragraph({ text: tc.description, spacing: { after: 200 } }));

      if (tc.testData && tc.testData.length > 0) {
         const dataStr = tc.testData.map(d => `${d.key}: ${d.value}`).join(' | ');
         children.push(new Paragraph({ 
           children: [ new TextRun({ text: "Test Data: ", bold: true }), new TextRun(dataStr) ],
           spacing: { after: 100 }
         }));
      }

      // Steps Table
      if (tc.steps.length > 0) {
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({text: "#", bold: true})], width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
                    new TableCell({ children: [new Paragraph({text: "Action", bold: true})], width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
                    new TableCell({ children: [new Paragraph({text: "Expected", bold: true})], width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
                ],
            })
        ];

        tc.steps.forEach(step => {
            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(step.stepNumber.toString())] }),
                        new TableCell({ children: [new Paragraph(step.action)] }),
                        new TableCell({ children: [new Paragraph(step.expected)] }),
                    ],
                })
            );
        });

        children.push(new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            }
        }));
        children.push(new Paragraph({ text: "", spacing: { after: 200 } })); // Spacer
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "MythosQA_Report.docx");
};
