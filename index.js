const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

const mongoose = require("mongoose");

const USERNAME = "hathequan";
const PASSWORD = "Quan2601";

// Replace the uri string with your connection string.
const uri = `mongodb+srv://${USERNAME}:${PASSWORD}@cluster0.lsw3ptt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const connectDB = async () => {
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB");

        const db = mongoose.connection.useDb('aeries_bookstore');

        // Define the schema for the Bookdata collection
        const bookSchema = new mongoose.Schema({
            image: String,
            name: String,
            description: String,
            price: Number,
            date: Date,
            author: String,
            pricef: String,
        }, { strict: false }, { timestamps: true });

        // Create the model
        const book = db.model('Bookdata', bookSchema, 'bookdata');

        // Query the database
        const bookdata = await book.find();

        console.log(bookdata); // Log the fetched data
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};
connectDB();
// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', async (req, res) => {
    try {
        const apiRouter = express.Router();
        const db = mongoose.connection.useDb('aeries_bookstore');
        const Book = db.model('Bookdata', new mongoose.Schema({}, { strict: false }), 'bookdata');
        
        // GET all books
        apiRouter.get('/books', async (req, res) => {
            const books = await Book.find();
            res.json(books);
        });

        // GET one book
        apiRouter.get('/books/:id', async (req, res) => {
            const book = await Book.findById(req.params.id);
            if (!book) return res.status(404).json({ message: 'Not found' });
            res.json(book);
        });

        // POST new book
        apiRouter.post('/books', express.json(), async (req, res) => {
            const newBook = new Book(req.body);
            await newBook.save();
            res.status(201).json(newBook);
        });

        // PUT update book
        apiRouter.put('/books/:id', express.json(), async (req, res) => {
            const updated = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!updated) return res.status(404).json({ message: 'Not found' });
            res.json(updated);
        });

        // DELETE book
        apiRouter.delete('/books/:id', async (req, res) => {
            const deleted = await Book.findByIdAndDelete(req.params.id);
            if (!deleted) return res.status(404).json({ message: 'Not found' });
            res.json({ message: 'Deleted successfully' });
        });

        app.use('/api', apiRouter);

        // Pagination logic
        const page = parseInt(req.query.page) || 1; // Current page (default to 1)
        const limit = 12; // Number of items per page
        const skip = (page - 1) * limit;

        // Sort logic
        const sortOption = req.query.sort || 'price'; // 'price' or 'date'
        const sortOrder = req.query.order === 'desc' ? -1 : 1;

        // Map 'date' to correct field if needed
        const sortField = (sortOption === 'price' || sortOption === 'date') ? sortOption : 'price';
        const sortQuery = {};
        sortQuery[sortField] = sortOrder;

        const searchQuery = req.query.search || '';
        const searchFilter = searchQuery 
        ? { name: { $regex: new RegExp(searchQuery, 'i') } } 
        : {};

        // Fetch paginated and sorted data
        const bookdata = await Book.find(searchFilter).sort(sortQuery).skip(skip).limit(limit);
        const totalBooks = await Book.countDocuments(searchFilter); // Total number of documents
        const totalPages = Math.ceil(totalBooks / limit); // Total number of pages

        // Render the EJS template with pagination and sorting data
        res.render('index', { 
            title: 'Aeries Bookstore', 
            bookdata, 
            currentPage: page, 
            totalPages,
            sortOption,
            sortOrder,
            searchQuery
        });

    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send("Error fetching data");
    }
});

app.post('/api/cart', express.urlencoded({ extended: true }), async (req, res) => {
    const { bookId, price } = req.body;

    try {
        const db = mongoose.connection.useDb('aeries_bookstore');
        const Book = db.model('Bookdata', new mongoose.Schema({}, { strict: false }), 'bookdata');

        const selectedBook = await Book.findById(bookId);
        if (!selectedBook) {
            return res.status(404).send("Book not found");
        }

        // Giả lập xử lý thanh toán
        const fakePayment = {
            status: "success",
            amount: price,
            book: selectedBook.name,
            message: `Thanh toán thành công cho "${selectedBook.name}" với giá ${price} VNĐ`
        };

        // Gửi kết quả thanh toán ra 1 trang mới hoặc chuyển về lại homepage
        res.render('payment_success', { payment: fakePayment });

    } catch (err) {
        console.error(err);
        res.status(500).send("Payment failed");
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});