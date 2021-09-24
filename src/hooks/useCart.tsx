import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const existingProductIndex = cart.findIndex((product) => product.id === productId)
      
      const updatedCart = [...cart];

      const productToAdd = {...updatedCart[existingProductIndex]};
      
      const productInStock = (await api.get(`/stock/${productId}`)).data;
      
      if (productInStock.amount < (productToAdd.amount + 1)) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      
      if (existingProductIndex !== -1) {
        updatedCart[existingProductIndex] = {
          ...productToAdd,
          amount: productToAdd.amount + 1
        }
      } else {
        const productToAdd = await api.get(`/products/${productId}`);
        
        updatedCart.push({
          ...productToAdd.data,
          amount: 1
        });
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart)

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId)

      if (!productInCart) {
        throw Error
      }

      const updatedCart = cart.filter(product => product.id !== productInCart.id)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const productInStock = (await api.get(`/stock/${productId}`)).data;

      if ( productInStock.amount < amount ) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const productToUpdate = cart.find(product => product.id === productId);

      if (productToUpdate) {
        const productToUpdateIndex = cart.indexOf(productToUpdate);
        const updatedCart = [...cart]
        updatedCart[productToUpdateIndex] = {
          ...productToUpdate,
          amount: amount
        }

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart)
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
