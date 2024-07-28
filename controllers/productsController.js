const mongoose = require('mongoose');
const getProductModel = require('../models/getProductModel');
const Product = getProductModel('products'); 


const getRecommendedProducts = async (req, res) => {
    try {
        const collections = ['frozen', 'sweets and snacks','milk', 'fruits', 'vegetables', 'drinks','Bread and pastries', 'dry','cleanliness',  'meat', 'fish']; // Replace with your actual collection names
        let recommendedProducts = [];

        for (const collectionName of collections) {
            const collection = await getProductModel(collectionName);
            const foundProducts = await collection.find({ recommended: true }).exec();
            console.log(`Found ${foundProducts.length} products in ${collectionName}`);

            // Attach the collection name to each product
            foundProducts.forEach(product => product.collectionName = collectionName);

            recommendedProducts = recommendedProducts.concat(foundProducts);
        }

        console.log(recommendedProducts.length);
        res.render('homePage.ejs', { recommendedProducts });
    } catch (err) {
        console.log('Error fetching recommended products:', err);
        res.status(500).send('Internal Server Error');
    }
};

const getProductsFromCollection = async (req, res) => {
    const { collectionName } = req.params;
    const categoryNames = {
        meat: 'בשר',
        fish: 'דגים',
        milk: 'מוצרי חלב',
        fruits: 'פירות',
        vegetables: 'ירקות',
        cleanliness: 'ניקיון',
        dry: ' יבשים',
        'sweets and snacks': 'ממתקים וחטיפים',
        drinks: 'משקאות',
        frozen: 'קפואים',
        'Bread and pastries': 'לחמים ומאפים'
    };
    try {
        const ProductModel = getProductModel(collectionName);
        const products = await ProductModel.find().exec();
        const collectionNameHebrew = categoryNames[collectionName];

        // Attach the collection name to each product
        products.forEach(product => {
            product.collectionName = collectionName;
        });

        const cart = req.session.cart || []; // Or fetch cart from a different source if not using session
        res.render('products', { Products: products, collectionName: collectionNameHebrew, cart, user: req.session.user });
    } catch (err) {
        console.error(`Error retrieving products from ${collectionName} collection:`, err);
        res.status(500).send('Internal Server Error');
    }
};



//only admin: 
const renderAddProductForm = (req, res) => {
    res.render('admin/addProduct', { user: req.session.user });
};


const categoryMap = {
    'בשר': 'meat',
    'דגים': 'fish',
    'מוצרי חלב': 'milk',
    'פירות': 'fruits',
    'ירקות': 'vegetables',
    'ניקיון': 'cleanliness',
    'יבשים': 'dry',
    'ממתקים וחטיפים': 'sweets and snacks',
    'משקאות': 'drinks',
    'קפואים': 'frozen',
    'לחמים ומאפים': 'bread and pastries'
};
const addProduct = async (req, res) => {
    const { title, img, name, price, category, sub, supplier, amount, recommended } = req.body;
    const collectionName = categoryMap[category]; // Convert Hebrew category to English collection name

    if (!collectionName) {
        return res.status(400).send('Invalid category');
    }

    const isRecommended = recommended === 'כן'; // Convert "כן" to true and "לא" to false

    try {
        const Product = getProductModel(collectionName); // Get the correct model based on the collection name
        const newProduct = new Product({
            title,
            img,
            name,
            price,
            sub,
            supplier,
            amount,
            recommended: isRecommended
        });
        await newProduct.save();
        res.redirect(`/admin/${collectionName}`); // Redirect back to the collection page
    } catch (err) {
        console.error('Error adding product:', err);
        res.redirect(`/admin/${collectionName}?error=Failed to add product`);
    }
};


const renderEditProductForm = async (req, res) => {
    const { collectionName, id } = req.params;
    const Product = getProductModel(collectionName);
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.redirect('/admin/products?error=Product not found');
        }
        res.render('admin/productsEdit', { product, user: req.session.user });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.redirect('/admin/products?error=Failed to fetch product');
    }
};

const updateProduct = async (req, res) => {
    const { collectionName, id } = req.params;
    const { title, img, name, price, category, description, supplier, amount, recommended } = req.body;
    const Product = getProductModel(collectionName);
    try {
        await Product.findByIdAndUpdate(id, {
            title,
            img,
            name,
            price,
            category,
            description,
            supplier,
            amount,
            recommended
        });
        res.redirect('/admin/products?success=Product updated successfully');
    } catch (err) {
        console.error('Error updating product:', err);
        res.redirect(`/admin/products/edit/${collectionName}/${id}?error=Failed to update product`);
    }
};

const deleteProduct = async (req, res) => {
    const { collectionName, id } = req.params;
    const Product = getProductModel(collectionName);
    try {
        await Product.findByIdAndDelete(id);
        res.redirect('/admin/products?success=Product deleted successfully');
    } catch (err) {
        console.error('Error deleting product:', err);
        res.redirect('/admin/products?error=Failed to delete product');
    }
};



// Export all functions at the end
module.exports = {
    getRecommendedProducts,
    getProductsFromCollection,
    renderAddProductForm,
    addProduct,
    renderEditProductForm,
    updateProduct,
    deleteProduct,
};
