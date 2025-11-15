const adddecision = require("../model/add-decision");

const addDecision = async (req, res) => {
    try {
        const { title, sector, supervisor, isPresidentDecision } = req.body;
        const newDecision = new adddecision({
            title,
            sector,
            supervisor: supervisor || null,
            isPresidentDecision ,
        });
        await newDecision.save();
        res.status(201).json(newDecision);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getalldecisions = async (req, res) => {
    try {
      // نتأكد إن المستخدم عنده قطاعات
    if (!req.user.sector || req.user.sector.length === 0) {
      return res.status(400).json({ error: "المستخدم ليس له قطاع" });
    }
    const decisions = await adddecision.find({
      sector: { $in: req.user.sector } // 
    }).populate("sector").populate("supervisor");
        res.status(200).json(decisions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedDecision = await adddecision.findByIdAndDelete(id);
        if (!deletedDecision) {
            return res.status(404).json({ error: "Decision not found" });
        }
        res.status(200).json({ message: "Decision deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDecisionById = async (req, res) => {
    try {
        const { id } = req.params;
        const decision = await adddecision.findById(id).populate("sector").populate("supervisor");
        if (!decision) {
            return res.status(404).json({ error: "Decision not found" });
        }
        res.status(200).json(decision);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedDecision = await adddecision.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedDecision) {
            return res.status(404).json({ error: "Decision not found" });
        }
        res.status(200).json(updatedDecision);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addDecision,
    getalldecisions,
    deleteDecision,
    getDecisionById,
    updateDecision
};

