document.addEventListener("alpine:init", () => {
    Alpine.data('pizzaCart', () => {
        return {
            title: 'Pizza Paradise',
            pizzas: [],
            featuredPizzas: [], // Array for featured pizzas
            username: '',
            cartId: '',
            cartPizzas: [],
            cartTotal: 0.00,
            paymentAmount: 0,
            message: '',
            paymentSuccessful: false, // Flag to show order history button
            showHistory: false,
            orderHistory: [],

            // Define image mapping based on pizza flavours
            pizzaImages: {
                'Margherita': 'pizza 2.jpg',
                'Pepperoni': 'pizza 3.jpg',
                'Vegetarian': 'pizza 4.jpg'
            },

            login() {
                if (this.username.length > 2) {
                    localStorage.setItem('username', this.username);
                    this.createCart().then(() => {
                        this.showCartData();
                        this.loadOrderHistory();
                        this.loadFeaturedPizzas(); // Load featured pizzas
                        this.paymentSuccessful = false; // Reset payment status
                    });
                } else {
                    alert("Username is too short");
                }
            },

            logout() {
                if (confirm('Do you want to logout?')) {
                    this.username = '';
                    this.cartId = '';
                    localStorage.removeItem('cartId');
                    localStorage.removeItem('username');
                    this.showHistory = false; // Hide order history view
                    this.paymentSuccessful = false; // Hide view history button
                    this.cartPizzas = [];
                    this.cartTotal = 0.00;
                }
            },

            createCart() {
                if (!this.username) {
                    return Promise.resolve();
                }

                const cartId = localStorage.getItem('cartId');

                if (cartId) {
                    this.cartId = cartId;
                    return Promise.resolve();
                } else {
                    const createCartURL = `https://pizza-api.projectcodex.net/api/pizza-cart/create?username=${this.username}`;
                    return axios.get(createCartURL)
                        .then(result => {
                            this.cartId = result.data.cart_code;
                            localStorage.setItem('cartId', this.cartId);
                        });
                }
            },

            getCart() {
                const getCartUrl = `https://pizza-api.projectcodex.net/api/pizza-cart/${this.cartId}/get`;
                return axios.get(getCartUrl);
            },

            addPizza(pizzaId) {
                return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/add', {
                    "cart_code": this.cartId,
                    "pizza_id": pizzaId
                });
            },

            removePizza(pizzaId) {
                return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/remove', {
                    "cart_code": this.cartId,
                    "pizza_id": pizzaId
                });
            },

            payamount(amount) {
                return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/pay', {
                    "cart_code": this.cartId,
                    amount
                });
            },

            showCartData() {
                this.getCart().then(result => {
                    const cartData = result.data;
                    this.cartPizzas = cartData.pizzas;
                    this.cartTotal = parseFloat(cartData.total).toFixed(2);
                });
            },

            init() {
                const storedUsername = localStorage.getItem('username');
                if (storedUsername) {
                    this.username = storedUsername;
                }

                axios.get('https://pizza-api.projectcodex.net/api/pizzas')
                    .then(result => {
                        this.pizzas = result.data.pizzas;
                    });

                if (this.username && !this.cartId) {
                    this.createCart().then(() => {
                        this.showCartData();
                    });
                }
                this.loadOrderHistory(); // Load history on initialization
                this.paymentSuccessful = this.username ? this.paymentSuccessful : false; // Adjust button visibility
            },

            addPizzaToCart(pizzaId) {
                this.addPizza(pizzaId).then(() => {
                    this.showCartData();
                });
            },

            removePizzaFromCart(pizzaId) {
                this.removePizza(pizzaId).then(() => {
                    this.showCartData();
                });
            },

            increaseQty(pizzaId) {
                let pizza = this.cartPizzas.find(pizza => pizza.id === pizzaId);
                if (pizza) {
                    pizza.qty++;
                    this.updateCartTotal();
                }
            },

            decreaseQty(pizzaId) {
                let pizza = this.cartPizzas.find(pizza => pizza.id === pizzaId);
                if (pizza && pizza.qty > 0) {
                    pizza.qty--;
                    this.updateCartTotal();
                }
            },

            updateCartTotal() {
                this.cartTotal = this.cartPizzas.reduce((total, pizza) => total + (pizza.price * pizza.qty), 0).toFixed(2);
            },

            payForCart() {
                this.payamount(this.paymentAmount).then(result => {
                    if (result.data.status === 'failure') {
                        this.message = result.data.message;
                        setTimeout(() => this.message = '', 3000);
                    } else {
                        if (this.paymentAmount > this.cartTotal) {
                            const change = (this.paymentAmount - this.cartTotal).toFixed(2);
                            this.message = `Payment received! Change: R ${change}`;
                        } else {
                            this.message = 'Payment received!';
                        }
                        this.paymentSuccessful = true; // Set payment successful flag
                        this.orderHistory.push({
                            id: this.cartId,
                            pizzas: [...this.cartPizzas],
                            total: this.cartTotal
                        });
                        this.saveOrderHistory(); // Save history after payment
                        setTimeout(() => {
                            this.message = '';
                            this.cartPizzas = [];
                            this.cartTotal = 0.00;
                            this.cartId = '';
                            this.paymentAmount = 0;
                            localStorage.removeItem('cartId');
                            this.createCart();
                        }, 3000);
                    }
                });
            },

            showOrderHistory() {
                this.showHistory = !this.showHistory; // Toggle history view
            },

            saveOrderHistory() {
                if (this.username) {
                    // Ensure only the last 3 orders are kept
                    if (this.orderHistory.length > 3) {
                        this.orderHistory = this.orderHistory.slice(-3);
                    }
                    localStorage.setItem('orderHistory_' + this.username, JSON.stringify(this.orderHistory));
                }
            },

            loadOrderHistory() {
                const storedHistory = localStorage.getItem('orderHistory_' + this.username);
                if (storedHistory) {
                    this.orderHistory = JSON.parse(storedHistory);
                }
            },

            loadFeaturedPizzas() {
                axios.get('https://pizza-api.projectcodex.net/api/featured-pizzas') // Adjust endpoint if needed
                    .then(result => {
                        this.featuredPizzas = result.data.pizzas; // Assuming API returns featured pizzas
                    });
            },

            getPizzaImage(flavour) {
                return this.pizzaImages[flavour] || 'default-image.jpg'; // Fallback image if flavor is not found
            }
        }
    });
});
