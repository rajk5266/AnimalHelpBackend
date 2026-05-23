// // src/controllers/rescue.controller.ts
// import { Request, Response } from "express";
// import { db } from "../db/db.js";
// import { rescueReports } from "../db/schema.js";
// import { eq } from "drizzle-orm";

// // CREATE REPORT
// export const createReport = async (req: Request, res: Response) => {
//   try {
//     const result = await db
//       .insert(rescueReports)
//       .values(req.body)
//       .returning();

//     res.status(201).json({
//       success: true,
//       data: result[0],
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error creating report", error });
//   }
// };

// // GET ALL REPORTS
// export const getAllReports = async (_: Request, res: Response) => {
//   try {
//     const result = await db.select().from(rescueReports);

//     res.json({ success: true, data: result });
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching reports", error });
//   }
// };

// // GET REPORT BY ID
// export const getReportById = async (req: Request, res: Response) => {
//   try {
//     const id = Number(req.params.id);

//     const result = await db
//       .select()
//       .from(rescueReports)
//       .where(eq(rescueReports.id, id));

//     res.json({ success: true, data: result[0] });
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching report", error });
//   }
// };

// // UPDATE REPORT
// export const updateReport = async (req: Request, res: Response) => {
//   try {
//     const id = Number(req.params.id);

//     const result = await db
//       .update(rescueReports)
//       .set(req.body)
//       .where(eq(rescueReports.id, id))
//       .returning();

//     res.json({ success: true, data: result[0] });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating report", error });
//   }
// };

// // DELETE REPORT
// export const deleteReport = async (req: Request, res: Response) => {
//   try {
//     const id = Number(req.params.id);

//     await db.delete(rescueReports).where(eq(rescueReports.id, id));

//     res.json({ success: true, message: "Report deleted" });
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting report", error });
//   }
// };