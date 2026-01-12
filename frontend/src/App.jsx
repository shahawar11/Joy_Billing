import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";

// PROPER decimal handling - store as strings, calculate as integers
const toSmallestUnit = (value) => {
  // Convert to string, remove any non-numeric except decimal point
  const str = String(value).replace(/[^\d.]/g, "");
  if (!str || str === ".") return 0;

  // Split by decimal point
  const parts = str.split(".");
  const wholePart = parseInt(parts[0] || "0", 10);
  const decimalPart = parts[1] || "00";

  // Pad or truncate to 2 decimal places
  const paddedDecimal = (decimalPart + "00").substring(0, 2);

  // Convert to smallest unit (paise)
  return wholePart * 100 + parseInt(paddedDecimal, 10);
};

const fromSmallestUnit = (paise) => {
  const rupees = Math.floor(paise / 100);
  const paiseRemainder = paise % 100;
  return `${rupees}.${paiseRemainder.toString().padStart(2, "0")}`;
};

function App() {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [activeTab, setActiveTab] = useState("new-bill");

  // New Bill Form State
  const [newCustomer, setNewCustomer] = useState("");
  const [items, setItems] = useState([
    { fishName: "", boxes: "", costPerBox: "" },
  ]);

  // Payment State
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    fetchCustomers();
    fetchTransactions();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/customers`);
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const addCustomer = async (name) => {
    try {
      await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      fetchCustomers();
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { fishName: "", boxes: "", costPerBox: "" }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    let totalPaise = 0;
    items.forEach((item) => {
      if (item.boxes && item.costPerBox) {
        const boxesPaise = toSmallestUnit(item.boxes);
        const costPaise = toSmallestUnit(item.costPerBox);
        // Both are in paise, multiply gives paise², divide by 100 for paise
        const itemTotal = Math.floor((boxesPaise * costPaise) / 100);
        totalPaise += itemTotal;
      }
    });
    return fromSmallestUnit(totalPaise);
  };

  const submitBill = async () => {
    if (!newCustomer.trim()) {
      alert("Please enter customer name");
      return;
    }

    const validItems = items.filter(
      (item) => item.fishName && item.boxes && item.costPerBox
    );

    if (validItems.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const itemsWithTotal = validItems.map((item) => {
      const boxesPaise = toSmallestUnit(item.boxes);
      const costPaise = toSmallestUnit(item.costPerBox);
      const totalPaise = Math.floor((boxesPaise * costPaise) / 100);

      return {
        fishName: item.fishName,
        boxes: item.boxes,
        costPerBox: item.costPerBox,
        totalPaise: totalPaise,
      };
    });

    let totalPaise = 0;
    itemsWithTotal.forEach((item) => {
      totalPaise += item.totalPaise;
    });

    try {
      const customerExists = customers.find(
        (c) => c.name.toLowerCase() === newCustomer.toLowerCase()
      );

      if (!customerExists) {
        await addCustomer(newCustomer);
      }

      await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCustomer,
          items: itemsWithTotal,
          totalPaise: totalPaise,
          paidPaise: 0,
          remainingPaise: totalPaise,
        }),
      });

      alert("Bill created successfully!");
      setNewCustomer("");
      setItems([{ fishName: "", boxes: "", costPerBox: "" }]);
      fetchTransactions();
    } catch (error) {
      console.error("Error creating bill:", error);
      alert("Error creating bill");
    }
  };

  const addPayment = async () => {
    if (!selectedTransaction || !paymentAmount) {
      alert("Please enter payment amount");
      return;
    }

    const amountPaise = toSmallestUnit(paymentAmount);
    if (amountPaise <= 0 || amountPaise > selectedTransaction.remainingPaise) {
      alert("Invalid payment amount");
      return;
    }

    try {
      await fetch(
        `${API_URL}/transactions/${selectedTransaction._id}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountPaise: amountPaise,
            note: paymentNote,
          }),
        }
      );

      alert("Payment recorded successfully!");
      setPaymentAmount("");
      setPaymentNote("");
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Error recording payment");
    }
  };

  const filteredTransactions = selectedCustomer
    ? transactions.filter((t) => t.customerName === selectedCustomer)
    : transactions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg">
        <h1 className="text-4xl font-bold text-center">🐟 Joy Billing</h1>
        <p className="text-center text-blue-100 mt-2">Track Sales & Payments</p>
      </div>

      <div className="container mx-auto p-4 max-w-6xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("new-bill")}
            className={`px-6 py-3 rounded-lg font-semibold transition shadow ${
              activeTab === "new-bill"
                ? "bg-blue-600 text-white scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            📝 New Bill
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`px-6 py-3 rounded-lg font-semibold transition shadow ${
              activeTab === "records"
                ? "bg-blue-600 text-white scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            💰 Payment Records
          </button>
        </div>

        {/* New Bill Tab */}
        {activeTab === "new-bill" && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">
              Create New Bill
            </h2>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2 text-lg">
                Customer Name *
              </label>
              <input
                type="text"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                list="customers-list"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter or select customer name (e.g., Kartik)"
              />
              <datalist id="customers-list">
                {customers.map((customer) => (
                  <option key={customer._id} value={customer.name} />
                ))}
              </datalist>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">
                  Fish Items
                </h3>
                <button
                  onClick={addItem}
                  className="bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600 transition shadow-md flex items-center gap-2"
                >
                  <span className="text-xl">+</span> Add Item
                </button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border-2 border-gray-200"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fish Name
                    </label>
                    <input
                      type="text"
                      value={item.fishName}
                      onChange={(e) =>
                        updateItem(index, "fishName", e.target.value)
                      }
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Vanjiram, Pomfret..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Number of Boxes
                    </label>
                    <input
                      type="text"
                      value={item.boxes}
                      onChange={(e) =>
                        updateItem(index, "boxes", e.target.value)
                      }
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cost per Box (₹)
                    </label>
                    <input
                      type="text"
                      value={item.costPerBox}
                      onChange={(e) =>
                        updateItem(index, "costPerBox", e.target.value)
                      }
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className={`w-full py-3 rounded-lg font-semibold transition shadow ${
                        items.length === 1
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 pt-6 bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xl font-bold text-gray-800">
                  Total Amount:
                </span>
                <span className="text-4xl font-bold text-blue-600">
                  ₹{calculateTotal()}
                </span>
              </div>
              <button
                onClick={submitBill}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg text-xl font-bold hover:from-blue-700 hover:to-blue-800 transition shadow-lg transform hover:scale-105"
              >
                Create Bill
              </button>
            </div>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === "records" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block text-gray-700 font-semibold mb-2 text-lg">
                Filter by Customer
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {filteredTransactions.map((transaction) => (
              <div
                key={transaction._id}
                className="bg-white rounded-xl shadow-xl p-6 hover:shadow-2xl transition"
              >
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {transaction.customerName}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      📅{" "}
                      {new Date(transaction.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">
                      Total Amount
                    </p>
                    <p className="text-3xl font-bold text-gray-800">
                      ₹{fromSmallestUnit(transaction.totalPaise)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-3 text-lg">
                    Items Purchased:
                  </h4>
                  <div className="space-y-2">
                    {transaction.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-blue-50 to-gray-50 p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-lg text-gray-800">
                            🐟 {item.fishName}
                          </span>
                          <span className="text-gray-700 font-medium">
                            {item.boxes} boxes × ₹{item.costPerBox} =
                            <span className="text-blue-600 font-bold ml-2">
                              ₹{fromSmallestUnit(item.totalPaise)}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Paid Amount
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{fromSmallestUnit(transaction.paidPaise)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Remaining
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{fromSmallestUnit(transaction.remainingPaise)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Status
                    </p>
                    <p
                      className={`text-xl font-bold ${
                        transaction.remainingPaise === 0
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {transaction.remainingPaise === 0
                        ? "✅ Paid"
                        : "⏳ Pending"}
                    </p>
                  </div>
                </div>

                {transaction.payments && transaction.payments.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      💸 Payment History:
                    </h4>
                    {transaction.payments.map((payment, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm text-gray-700 mb-2 p-2 bg-white rounded"
                      >
                        <span className="font-medium">
                          {new Date(payment.date).toLocaleDateString("en-IN")}
                        </span>
                        <span className="font-bold text-green-600">
                          ₹{fromSmallestUnit(payment.amountPaise)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {transaction.remainingPaise > 0 && (
                  <div>
                    {selectedTransaction?._id === transaction._id ? (
                      <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <input
                          type="text"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter payment amount"
                        />
                        <input
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          className="w-full p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Note (optional)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={addPayment}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold shadow-md"
                          >
                            ✅ Confirm Payment
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransaction(null);
                              setPaymentAmount("");
                              setPaymentNote("");
                            }}
                            className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-semibold shadow-md"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg transform hover:scale-105 transition"
                      >
                        💳 Add Payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-16 text-center">
                <p className="text-gray-400 text-2xl">
                  📋 No transactions found
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
