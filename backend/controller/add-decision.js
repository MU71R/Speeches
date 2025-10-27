const user = require("../model/user");
const adddecision = require("../model/add-decision");
const sector = require("../model/sector");

const addDecision = async (req, res) => {
    try {
        const { title, sector, supervisor, isPresidentDecision } = req.body;
        const newDecision = new adddecision({
            title,
            sector,
            supervisor,
            isPresidentDecision,
        });
        await newDecision.save();
        res.status(201).json(newDecision);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getalldecisions = async (req, res) => {
    try {
        const decisions = await adddecision.find().populate("sector").populate("supervisor");
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

module.exports = {
    addDecision,
    getalldecisions,
    deleteDecision,
};
