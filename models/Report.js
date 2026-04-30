const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    emisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: false
    },
    usuarioReportado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    motivo: {
        type: String,
        required: true
    },
    detalles: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["pendiente", "revisado", "accion_tomada", "ignorado"],
        default: "pendiente"
    }
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
