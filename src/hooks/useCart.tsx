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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`/stock/${productId}`)
      const productsResponse = await api.get(`/products/${productId}`)

      if(!productsResponse) {
        toast.error('Erro na adição do produto')
        return
      }

      if(stockResponse.data.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if(cart.some(product => product.id === productId)) {
        cart.map(async product => {
          if(product.id === productId) {
            if(stockResponse.data.amount < product.amount + 1) {
              toast.error('Quantidade solicitada fora de estoque')
              return
            }
            await updateProductAmount({productId, amount: product.amount + 1})
            return
          }
        })
        return
      }

      const product = {...productsResponse.data, amount: 1}
      const newCart = [...cart, product]
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      return
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.some(product => product.id === productId)) {
        throw ''
      }

      const newCart = cart.filter(product => product.id !== productId)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        return
      }
      const stockResponse = await api.get(`/stock/${productId}`)
      if(amount > stockResponse.data.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      const newCart = cart.map(product => {
        if(product.id === productId) {
          return {...product, amount: amount}
        }

        return product
      })

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
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
