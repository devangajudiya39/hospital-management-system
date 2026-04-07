const mongoose = require("mongoose");
const Medicine = require("./models/Medicine.js");

const mongoURI = "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";

const medicinesData = [
  { name: "Paracetamol 500mg", unitPrice: 2.0, stockQuantity: 500, lowStockThreshold: 100 },
  { name: "Amoxicillin 500mg", unitPrice: 8.0, stockQuantity: 200, lowStockThreshold: 50 },
  { name: "Ibuprofen 400mg", unitPrice: 3.5, stockQuantity: 300, lowStockThreshold: 50 },
  { name: "Metformin 500mg", unitPrice: 2.5, stockQuantity: 1000, lowStockThreshold: 200 },
  { name: "Atorvastatin 20mg", unitPrice: 6.0, stockQuantity: 400, lowStockThreshold: 100 },
  { name: "Amlodipine 5mg", unitPrice: 4.0, stockQuantity: 600, lowStockThreshold: 150 },
  { name: "Omeprazole 20mg", unitPrice: 5.5, stockQuantity: 350, lowStockThreshold: 80 },
  { name: "Cetirizine 10mg", unitPrice: 1.5, stockQuantity: 800, lowStockThreshold: 150 },
  { name: "Azithromycin 500mg", unitPrice: 15.0, stockQuantity: 150, lowStockThreshold: 30 },
  { name: "Pantoprazole 40mg", unitPrice: 7.0, stockQuantity: 500, lowStockThreshold: 100 },
  { name: "Losartan 50mg", unitPrice: 5.0, stockQuantity: 450, lowStockThreshold: 100 },
  { name: "Aspirin 75mg", unitPrice: 1.0, stockQuantity: 1000, lowStockThreshold: 200 },
  { name: "Clopidogrel 75mg", unitPrice: 8.5, stockQuantity: 250, lowStockThreshold: 50 },
  { name: "Rosuvastatin 10mg", unitPrice: 9.0, stockQuantity: 300, lowStockThreshold: 75 },
  { name: "Levothyroxine 50mcg", unitPrice: 3.0, stockQuantity: 600, lowStockThreshold: 100 },
  { name: "Telmisartan 40mg", unitPrice: 6.5, stockQuantity: 400, lowStockThreshold: 80 },
  { name: "Montelukast 10mg", unitPrice: 12.0, stockQuantity: 200, lowStockThreshold: 40 },
  { name: "Metoprolol 50mg", unitPrice: 4.5, stockQuantity: 350, lowStockThreshold: 100 },
  { name: "Ciprofloxacin 500mg", unitPrice: 5.0, stockQuantity: 300, lowStockThreshold: 50 },
  { name: "Doxycycline 100mg", unitPrice: 4.0, stockQuantity: 250, lowStockThreshold: 50 },
  { name: "Fluconazole 150mg", unitPrice: 18.0, stockQuantity: 100, lowStockThreshold: 20 },
  { name: "Ranitidine 150mg", unitPrice: 2.0, stockQuantity: 800, lowStockThreshold: 150 },
  { name: "Diclofenac 50mg", unitPrice: 3.0, stockQuantity: 400, lowStockThreshold: 100 },
  { name: "Tramadol 50mg", unitPrice: 10.0, stockQuantity: 150, lowStockThreshold: 30 },
  { name: "Pregabalin 75mg", unitPrice: 15.5, stockQuantity: 200, lowStockThreshold: 40 },
  { name: "Gabapentin 300mg", unitPrice: 14.0, stockQuantity: 200, lowStockThreshold: 40 },
  { name: "Glimepiride 2mg", unitPrice: 4.0, stockQuantity: 500, lowStockThreshold: 100 },
  { name: "Teneligliptin 20mg", unitPrice: 12.5, stockQuantity: 250, lowStockThreshold: 50 },
  { name: "Domperidone 10mg", unitPrice: 2.5, stockQuantity: 600, lowStockThreshold: 100 },
  { name: "Ondansetron 4mg", unitPrice: 8.0, stockQuantity: 200, lowStockThreshold: 40 },
  { name: "Furosemide 40mg", unitPrice: 2.0, stockQuantity: 300, lowStockThreshold: 50 },
  { name: "Spironolactone 25mg", unitPrice: 4.0, stockQuantity: 250, lowStockThreshold: 50 },
  { name: "Salbutamol Inhaler (100mcg)", unitPrice: 150.0, stockQuantity: 50, lowStockThreshold: 10 },
  { name: "Budesonide Inhaler (200mcg)", unitPrice: 250.0, stockQuantity: 40, lowStockThreshold: 10 },
  { name: "Levocetirizine 5mg", unitPrice: 2.0, stockQuantity: 700, lowStockThreshold: 100 },
  { name: "Alprazolam 0.5mg", unitPrice: 5.0, stockQuantity: 150, lowStockThreshold: 25 },
  { name: "Clonazepam 0.5mg", unitPrice: 4.5, stockQuantity: 200, lowStockThreshold: 30 },
  { name: "Escitalopram 10mg", unitPrice: 11.0, stockQuantity: 150, lowStockThreshold: 30 },
  { name: "Sertraline 50mg", unitPrice: 10.0, stockQuantity: 180, lowStockThreshold: 35 },
  { name: "Carvedilol 6.25mg", unitPrice: 6.0, stockQuantity: 250, lowStockThreshold: 50 },
  { name: "Gliclazide 80mg", unitPrice: 7.0, stockQuantity: 300, lowStockThreshold: 60 },
  { name: "Sitagliptin 50mg", unitPrice: 20.0, stockQuantity: 150, lowStockThreshold: 30 },
  { name: "Mycophenolate 500mg", unitPrice: 45.0, stockQuantity: 50, lowStockThreshold: 10 },
  { name: "Tacrolimus 1mg", unitPrice: 70.0, stockQuantity: 40, lowStockThreshold: 10 },
  { name: "Vitamin D3 60K IU", unitPrice: 25.0, stockQuantity: 300, lowStockThreshold: 50 },
  { name: "Calcium Carbonate 500mg", unitPrice: 5.0, stockQuantity: 600, lowStockThreshold: 100 },
  { name: "Multivitamin Capsules", unitPrice: 6.0, stockQuantity: 800, lowStockThreshold: 150 },
  { name: "Iron + Folic Acid Tablets", unitPrice: 4.0, stockQuantity: 1000, lowStockThreshold: 200 },
  { name: "B-Complex Syrup 200ml", unitPrice: 45.0, stockQuantity: 150, lowStockThreshold: 30 },
  { name: "Cough Syrup (Dextromethorphan) 100ml", unitPrice: 85.0, stockQuantity: 200, lowStockThreshold: 40 }
];

mongoose.connect(mongoURI).then(async () => {
    console.log("Connected to MongoDB for seeding...");

    const manufacturers = ["Cipla", "Sun Pharma", "Dr. Reddy's", "Lupin", "Torrent Pharma", "Zydus Cadila", "Pfizer", "GSK", "Mankind Pharma", "Abbott"];
    
    let added = 0;
    let updated = 0;
    
    for (let i = 0; i < medicinesData.length; i++) {
        let med = medicinesData[i];
        // Populate missing schema fields dynamically
        if(!med.manufacturer) med.manufacturer = manufacturers[i % manufacturers.length];
        if(!med.description) med.description = `High-quality medical grade ${med.name.split(' ')[0]} prescribed for clinical treatments and rapid recovery.`;
        const exists = await Medicine.findOne({ name: med.name });
        if (!exists) {
            await new Medicine(med).save();
            added++;
        } else {
            // Update existing ones seamlessly so DB gets the new schema fields
            await Medicine.updateOne({ name: med.name }, { $set: { manufacturer: med.manufacturer, description: med.description } });
            updated++;
        }
    }
    console.log(`Successfully seeded ${added} new medicines and updated ${updated} existing ones!`);
    await mongoose.connection.close();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
