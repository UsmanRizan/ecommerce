import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatPrice } from "../lib/currency";

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user } = useUserStore();
  const { cart, addToCart, updateQuantity } = useCartStore();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      setNotFound(false);
      setQuantity(1);
      try {
        const res = await axios.get(`/products/${id}`);
        setProduct(res.data);

        const relatedRes = await axios.get(
          `/products/category/${res.data.category}`,
        );
        setRelatedProducts(
          relatedRes.data.products.filter((p) => p._id !== id).slice(0, 4),
        );
      } catch (error) {
        if (error.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error(error.response?.data?.message || "Failed to load product");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const inCart = cart.find((item) => item._id === product?._id);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please login to add products to cart", { id: "login" });
      return;
    }
    // addToCart adds one item; top up to the chosen quantity afterwards
    const newQuantity = (inCart?.quantity || 0) + quantity;
    await addToCart(product);
    if (quantity > 1) {
      await updateQuantity(product._id, newQuantity);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (notFound || !product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-3xl font-bold text-emerald-400">
          Product not found
        </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to={`/category/${product.category}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft size={16} />
          Back to {product.category}
        </Link>

        <motion.div
          className="grid grid-cols-1 gap-10 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>

          <div className="flex flex-col">
            <Link
              to={`/category/${product.category}`}
              className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-400 hover:text-emerald-300"
            >
              {product.category}
            </Link>
            <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              {product.name}
            </h1>
            <p className="mb-6 text-3xl font-bold text-emerald-400">
              {formatPrice(product.price)}
            </p>

            <p className="mb-8 whitespace-pre-line leading-relaxed text-gray-300">
              {product.description}
            </p>

            <div className="mb-6 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-300">
                Quantity
              </span>
              <div className="flex items-center gap-3 rounded-lg border border-gray-600 bg-gray-800 px-2 py-1">
                <button
                  className="rounded p-1 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <button
                  className="rounded p-1 text-gray-300 hover:bg-gray-700"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 sm:w-auto"
            >
              <ShoppingCart size={20} className="mr-2" />
              Add to cart
            </button>

            {inCart && (
              <p className="mt-4 text-sm text-gray-400">
                {inCart.quantity} in your cart ·{" "}
                <Link
                  to="/cart"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  View cart
                </Link>
              </p>
            )}
          </div>
        </motion.div>

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-semibold text-emerald-400">
              More in {product.category}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
