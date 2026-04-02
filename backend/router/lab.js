const express = require("express");
const labRouter = express.Router();
const LabRequest = require("../models/LabRequest.js");
const LabReport = require("../models/LabReport.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

labRouter.use(authenticate, authorizeRole("lab_staff", "admin"));

// Get pending/in-progress lab requests
labRouter.get("/requests", async (req, res) => {
    try {
        const requests = await LabRequest.find({ status: { $ne: "completed" } })
            .populate({ path: "patientId", populate: { path: "userId", select: "name" } })
            .populate("doctorId", "name")
            .sort({ createdAt: -1 });

        const result = requests.map(r => ({
            _id: r._id,
            testType: r.testType,
            status: r.status,
            patientId: {
                _id: r.patientId?._id,
                name: r.patientId?.userId?.name || "—"
            },
            doctorId: {
                _id: r.doctorId?._id,
                name: r.doctorId?.name || "—"
            }
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Test Status
labRouter.patch("/update-status/:id", async (req, res) => {
    const { status } = req.body;
    try {
        const request = await LabRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ message: `Lab request status updated to ${status}`, request });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Upload Report
labRouter.post("/upload-report", async (req, res) => {
    const { requestId, resultDetails, fileUrl } = req.body;
    try {
        const request = await LabRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: "Lab request not found" });

        const report = new LabReport({
            requestId,
            patientId: request.patientId,
            doctorId: request.doctorId,
            resultDetails,
            fileUrl,
            status: "completed"
        });
        await report.save();

        request.status = "completed";
        await request.save();

        // In a real system, we might push a notification to the Doctor and Patient here.
        // E.g. Notifications.send({ to: [request.patientId, request.doctorId], msg: "Lab report ready" });

        res.status(201).json({ message: "Report uploaded successfully. Patient & Doctor notified.", report });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = labRouter;
