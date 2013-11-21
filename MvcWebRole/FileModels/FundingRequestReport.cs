using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using FundEntities;
using OfficeOpenXml;
using System.Drawing;
using System.Web.Configuration;
using MvcWebRole.Controllers;
using MvcWebRole.Extensions;

namespace MvcWebRole.FileModels
{
    public class FundingRequestReport : Report
    {
        private const int NUM_COLUMNS = 7;
        private const int SUMMARY_DATA_COLUMNS = 4;
        private IEnumerable<Fund> Funds { get; set; }
        private int Row { get; set; }

        public FundingRequestReport(IEnumerable<Area> areas, IEnumerable<Fund> funds)
        {
            this.Funds = funds;

            ExcelPackage package = new ExcelPackage();
            ExcelWorksheet sheet = package.Workbook.Worksheets.Add("Funding Request Report");

            #region Table Labels
            Row++;
            sheet = WriteTableLabels(sheet);
            #endregion

            #region Area Data
            foreach (Area area in areas.Where(a => a.Number != "O"))
            {

                sheet = WriteAreaData(sheet, area);
            }
            #endregion

            #region University Data
            sheet = WriteUniversityData(sheet);
            #endregion

            #region Other Uses of Funds Data
            foreach (Area area in areas.Where(r => r.Number == "O"))
            {
                sheet = WriteAreaData(sheet, area);
            }
            #endregion

            sheet = PerformFinalFormatting(sheet);

            this.BinaryData = package.GetAsByteArray();
            this.FileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            this.FileName = "FoundationPortal_" + System.DateTime.Now.ToShortDateString() + ".xlsx";
        }

        private ExcelWorksheet PerformFinalFormatting(ExcelWorksheet sheet)
        {
            //Header
            sheet.HeaderFooter.FirstHeader.LeftAlignedText = "VIRGINIA TECH FOUNDATION INC.\n"
                + "UNRESTRICTED BUDGET\n" +
                "FY " + WebConfigurationManager.AppSettings["FiscalYear"].ToString();

            //Footer
            sheet.HeaderFooter.FirstFooter.CenteredText = System.DateTime.Now.ToShortDateString() +
                " Summary of VT Foundation Funding Request FY " +
                WebConfigurationManager.AppSettings["FiscalYear"].ToString();

            //Printing
            sheet.PrinterSettings.Orientation = eOrientation.Landscape;
            sheet.PrinterSettings.FitToPage = true;
            sheet.PrinterSettings.FitToWidth = 1;
            sheet.PrinterSettings.FitToHeight = 0;
            ExcelRange range_numberFormatting =
                sheet.Cells[1, NUM_COLUMNS - SUMMARY_DATA_COLUMNS + 1, 100, NUM_COLUMNS];

            //Cell styling
            range_numberFormatting.Style.Numberformat.Format = "_($* #,##0_);_($* (#,##0);_($* \"-\"_);_(@_)";

            sheet.Cells.AutoFitColumns();

            return sheet;
        }

        private ExcelWorksheet WriteTableLabels(ExcelWorksheet sheet)
        {
            int column = 0;
            ExcelRange range_labels = sheet.Cells[Row, 1, Row, NUM_COLUMNS];
            range_labels.Style.Font.SetFromFont(new Font("Calibri", 11, FontStyle.Bold));
            range_labels.Style.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.CenterContinuous;
            range_labels.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
            range_labels.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(200, 200, 200));
            range_labels.Style.Border.Bottom.Style = OfficeOpenXml.Style.ExcelBorderStyle.Medium;

            sheet.Cells[Row, ++column].Value = DataAnnotationsHelper.GetPropertyName<Fund>(f => f.Number);
            sheet.Cells[Row, ++column].Value = DataAnnotationsHelper.GetPropertyName<Fund>(f => f.Title);
            sheet.Cells[Row, ++column].Value = DataAnnotationsHelper.GetPropertyName<Fund>(f => f.ResponsiblePerson);
            sheet.Cells[Row, ++column].Value =
                DataAnnotationsHelper.GetPropertyName<Fund>(f => f.CurrentBudget);
            sheet.Cells[Row, ++column].Value =
                DataAnnotationsHelper.GetPropertyName<Fund>(f => f.ProjectedExpenditures);
            sheet.Cells[Row, ++column].Value = "Requested Budget";
            sheet.Cells[Row, ++column].Value = "Variance";

            return sheet;
        }

        private ExcelWorksheet WriteAreaData(ExcelWorksheet sheet, Area area)
        {
            int column = 0;

            #region Area Name
            Row++;
            ExcelRange range_areaName = sheet.Cells[Row, 1, Row, NUM_COLUMNS];
            range_areaName.Merge = true;
            range_areaName.Style.Font.SetFromFont(new Font("Calibri", 11, FontStyle.Italic));
            range_areaName.Style.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.CenterContinuous;
            range_areaName.Value = area.Name;
            #endregion

            #region Area Funds
            IEnumerable<Fund> areaFunds = Funds.Where(f => f.AreaId == area.Id);

            if (areaFunds.Count() == 0)
            {
                Row++;
                ExcelRange range_areaData = sheet.Cells[Row, 1, Row, NUM_COLUMNS];
                range_areaData.Merge = true;
                range_areaData.Style.Font.SetFromFont(new Font("Calibri", 11, FontStyle.Regular));
                range_areaData.Style.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.CenterContinuous;
                range_areaData.Value = "No records";
            }
            else
            {
                foreach (Fund fund in areaFunds)
                {
                    Row++;
                    column = 0;
                    sheet.Cells[Row, ++column].Value = fund.Number;
                    sheet.Cells[Row, ++column].Value = fund.Title;
                    sheet.Cells[Row, ++column].Value = fund.ResponsiblePerson;
                    sheet.Cells[Row, ++column].Value = fund.CurrentBudget;
                    sheet.Cells[Row, ++column].Value = fund.ProjectedExpenditures;
                    sheet.Cells[Row, ++column].Value = (fund.CurrentBudget + fund.BudgetAdjustment);
                    sheet.Cells[Row, ++column].Value = (fund.CurrentBudget - fund.CurrentBudget + fund.BudgetAdjustment);
                }
            }
            #endregion

            #region Area Summary
            Row++;
            column = 0;
            ExcelRange range_areaSummary = sheet.Cells[Row, 1, Row, NUM_COLUMNS];
            range_areaSummary.Style.Font.SetFromFont(new Font("Calibri", 11, FontStyle.Bold));
            range_areaSummary.Style.Font.Color.SetColor(Color.White);
            range_areaSummary.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
            range_areaSummary.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(107, 107, 107));

            ExcelRange range_areaSummaryTitle = sheet.Cells[Row, 1, Row, NUM_COLUMNS - SUMMARY_DATA_COLUMNS];
            range_areaSummaryTitle.Merge = true;
            range_areaSummaryTitle.Value = "Total for " + area.Name;

            sheet.Cells[Row, SUMMARY_DATA_COLUMNS].Value = areaFunds
                .Sum(f => f.CurrentBudget);
            sheet.Cells[Row, ++column + SUMMARY_DATA_COLUMNS].Value = areaFunds
                .Sum(f => f.ProjectedExpenditures);
            sheet.Cells[Row, ++column + SUMMARY_DATA_COLUMNS].Value = areaFunds
                .Sum(f => f.CurrentBudget + f.BudgetAdjustment);
            sheet.Cells[Row, ++column + SUMMARY_DATA_COLUMNS].Value = areaFunds
                .Sum(f => f.CurrentBudget - f.CurrentBudget + f.BudgetAdjustment);
            #endregion

            return sheet;
        }

        private ExcelWorksheet WriteUniversityData(ExcelWorksheet sheet)
        {
            int column = 0;
            this.Row++;

            column = 0;
            ExcelRange range_universitySummary = sheet.Cells[Row, 1, Row, NUM_COLUMNS];

            ExcelRange range_universitySummaryTitle = sheet.Cells[Row, 1, Row, NUM_COLUMNS - SUMMARY_DATA_COLUMNS];
            range_universitySummaryTitle.Merge = true;
            range_universitySummary.Style.Font.SetFromFont(new Font("Calibri", 11, FontStyle.Bold));
            range_universitySummary.Style.Font.Color.SetColor(Color.White);
            range_universitySummary.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
            range_universitySummary.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(43, 166, 203));
            range_universitySummaryTitle.Value = "Grand Total for University Programs";

            sheet.Cells[Row, column + SUMMARY_DATA_COLUMNS].Value = Funds.Sum(f => f.CurrentBudget);
            sheet.Cells[Row, ++column + SUMMARY_DATA_COLUMNS].Value = Funds.Sum(f => f.ProjectedExpenditures);
            sheet.Cells[Row, ++column + SUMMARY_DATA_COLUMNS].Value = 
                Funds.Sum(f => f.CurrentBudget + f.BudgetAdjustment);
            sheet.Cells[Row, ++column + SUMMARY_DATA_COLUMNS].Value =
                Funds.Sum(f => f.CurrentBudget - f.CurrentBudget + f.BudgetAdjustment);

            return sheet;
        }
    }
}