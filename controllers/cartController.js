const getProductModel = require('../models/getProductModel');
const Order = require('../models/order');
const User = require('../models/user');

const addToCart = async (req, res) => {
    const { productId, quantity, category } = req.body;

    // Ensure that all required fields are present
    if (!productId || !quantity || !category) {
        return res.status(400).json({ message: 'Product ID, quantity, and category are required' });
    }

    console.log('Request body:', req.body);

    try {
        // Get the product model based on the category
        const Product = getProductModel(category);

        // Check if the Product model was successfully retrieved
        if (!Product) {
            console.error('Invalid category:', category);
            return res.status(400).json({ message: 'Invalid category' });
        }

        // Fetch the product from the database
        const product = await Product.findById(productId);

        if (!product) {
            console.error('Product not found:', productId);
            return res.status(404).json({ message: 'Product not found' });
        }

        const quantityInt = parseInt(quantity, 10);
        console.log('Parsed quantity:', quantityInt);

        // Check if there's enough stock
        if (product.amount < quantityInt) {
            console.error('Not enough stock available for product:', productId);
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        // Update the product quantity in the database
        product.amount -= quantityInt;
        await product.save();
        console.log('Updated product amount:', product.amount);

        // Add the product to the cart (assuming req.session.cart is an array)
        let cart = req.session.cart || [];
        const cartItem = cart.find(item => item._id === productId && item.category === category);

        if (cartItem) {
            cartItem.quantity += quantityInt;
        } else {
            cart.push({
                _id: product._id,
                title: product.title,
                img: product.img,
                price: product.price,
                quantity: quantityInt,
                category: category // Include the category in the cart item
            });
        }

        req.session.cart = cart;
        console.log('Updated cart:', req.session.cart);

        return res.status(200).json({ 
            cart: req.session.cart, 
            message: 'Product added to cart successfully', 
            newAmount: product.amount // Return the new amount of the product
        });
    } catch (err) {
        console.error('Internal server error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


const viewCart = (req, res) => {
    let cart = req.session.cart || [];

    // Calculate total price
    const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    res.render('cart', { cart, total: totalPrice });
};

const checkout = (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
        return res.redirect('/cart');
    }
    res.render('checkout', { cart, user: req.session.user });
};

const placeOrder = async (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
        return res.redirect('/cart');
    }

    try {
        const user = await User.findById(req.session.user._id).select('fName lName gmail');
        if (!user) {
            return res.status(404).send('User not found');
        }

        const orderProducts = cart.map(item => ({
            productId: item._id, 
            title: item.title,
            price: item.price,
            quantity: item.quantity
        }));

        const order = new Order({
            user: req.session.user._id,
            userDetails: {
                fName: user.fName,
                lName: user.lName,
                gmail: user.gmail
            },
            products: orderProducts,
            total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
        });

        console.log('Order to be saved:', order); // Debug log
        await order.save();
        req.session.cart = []; // Clear the cart after placing the order
        res.render('orderSuccess');
    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).send('Internal Server Error');
    }
};


const emptyCart = async (req, res) => {
    // Retrieve the cart from the session
    let cart = req.session.cart || [];

    try {
        // Loop through the cart items
        for (const item of cart) {
            // Get the model for the product category
            const Product = getProductModel(item.category);

            // Find the product in the database
            const product = await Product.findById(item._id);

            if (!product) {
                console.error('Product not found:', item._id);
                continue; // Skip this product and continue with the next one
            }

            // Update the product's amount in the database
            product.amount += item.quantity;
            await product.save();
            console.log('Updated product amount:', product._id, product.amount);
        }

        // Empty the cart
        req.session.cart = [];

        res.json({ message: 'הסל התבטל' });
    } catch (err) {
        console.error('Internal server error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// Remove a product from the cart
const removeProductFromCart = async (req, res) => {
    const productName = req.params.name; 
    console.log('Removing product with name:', productName);

    // Retrieve the cart from the session
    let cart = req.session.cart || [];
    console.log('Current cart:', cart);

    // Find the item to remove from the cart
    const itemToRemove = cart.find(item => item.title === productName);

    if (!itemToRemove) {
        console.log('Product not found in cart');
        return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Get the product category from the item to use for model lookup
    const productCategory = itemToRemove.category; // Ensure `category` is properly set in the cart item
    console.log(productCategory); 
    const Product = getProductModel(productCategory); // Get model based on category

    try {
        // Fetch the product from the database
        const product = await Product.findOne({ title: productName });
        //מחפשת את המוצר לפי השם שלו ומחכה לסיום החיפוש, שומרת במשתנה

        if (!product) {
            console.log('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        // Update the product amount in the database
        product.amount += itemToRemove.quantity;
        await product.save();

        // Remove the product from the cart
        cart = cart.filter(item => item.title !== productName);
        req.session.cart = cart;

        console.log('Updated cart:', cart);
        res.json({ 
            message: 'Product removed successfully', 
            cart: req.session.cart 
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};


module.exports = {
    addToCart,
    viewCart,
    checkout,
    placeOrder, 
    emptyCart,
    removeProductFromCart
};
