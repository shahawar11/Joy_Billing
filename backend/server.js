import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// Models - EVERYTHING IN PAISE (INTEGERS)
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  phone: String,
  address: String,
  createdAt: { type: Date, default: Date.now },
});

const fishSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const transactionSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  items: [
    {
      fishName: String,
      boxes: Number,
      costPerBox: Number,
      totalPaise: Number,
    },
  ],
  totalPaise: { type: Number, required: true },
  paidPaise: { type: Number, default: 0 },
  remainingPaise: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  payments: [
    {
      amountPaise: Number,
      date: { type: Date, default: Date.now },
      note: String,
    },
  ],
  
});
transactionSchema.index({ date: -1 }); // 🔥 for all transactions
transactionSchema.index({ customerName: 1, date: -1 }); // 🔥 for customer history

const Customer = mongoose.model("Customer", customerSchema);
const Fish = mongoose.model("Fish", fishSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// Routes

// Get all customers
app.get("/api/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add customer
app.post("/api/customers", async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all fish names
app.get("/api/fish", async (req, res) => {
  try {
    const fish = await Fish.find().sort({ name: 1 });
    res.json(fish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add fish name
app.post("/api/fish", async (req, res) => {
  try {
    const fish = new Fish(req.body);
    await fish.save();
    res.status(201).json(fish);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete fish name
app.delete("/api/fish/:id", async (req, res) => {
  try {
    await Fish.findByIdAndDelete(req.params.id);
    res.json({ message: "Fish deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by customer
app.get("/api/transactions/customer/:name", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      customerName: req.params.name,
    }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add payment to transaction - ALL INTEGER ARITHMETIC
app.post("/api/transactions/:id/payment", async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const { amountPaise, note } = req.body;

    // Validate payment amount
    if (amountPaise <= 0 || amountPaise > transaction.remainingPaise) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    // Add payment (pure integer arithmetic)
    transaction.payments.push({
      amountPaise: amountPaise,
      note: note || "",
      date: new Date(),
    });

    // Update paid and remaining amounts (pure integer arithmetic)
    transaction.paidPaise = transaction.paidPaise + amountPaise;
    transaction.remainingPaise = transaction.totalPaise - transaction.paidPaise;

    await transaction.save();
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get customer summary
app.get("/api/summary/:customerName", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      customerName: req.params.customerName,
    });

    // Pure integer arithmetic
    let totalCreditPaise = 0;
    let totalPaidPaise = 0;
    let totalRemainingPaise = 0;

    transactions.forEach((t) => {
      totalCreditPaise += t.totalPaise;
      totalPaidPaise += t.paidPaise;
      totalRemainingPaise += t.remainingPaise;
    });

    res.json({
      customerName: req.params.customerName,
      totalTransactions: transactions.length,
      totalCreditPaise: totalCreditPaise,
      totalPaidPaise: totalPaidPaise,
      totalRemainingPaise: totalRemainingPaise,
      totalCredit: (totalCreditPaise / 100).toFixed(2),
      totalPaid: (totalPaidPaise / 100).toFixed(2),
      totalRemaining: (totalRemainingPaise / 100).toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
