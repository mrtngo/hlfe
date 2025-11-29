import streamlit as st
from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants
import eth_account
from eth_account.signers.local import LocalAccount

st.title("Hyperliquid Testnet Order Tester")

st.markdown("""
This app tests order placement on Hyperliquid Testnet using the official Python SDK.
""")

# Input private key
private_key = st.text_input("Private Key (without 0x prefix)", type="password")

if private_key:
    try:
        # Add 0x prefix if not present
        if not private_key.startswith('0x'):
            private_key = '0x' + private_key
        
        # Create account from private key
        account: LocalAccount = eth_account.Account.from_key(private_key)
        wallet_address = account.address
        
        st.success(f"✅ Wallet Address: `{wallet_address}`")
        
        # Initialize Hyperliquid SDK for testnet
        info = Info(constants.TESTNET_API_URL, skip_ws=True)
        exchange = Exchange(account, constants.TESTNET_API_URL)
        
        st.markdown("---")
        st.subheader("Account Info")
        
        # Get account state
        try:
            user_state = info.user_state(wallet_address)
            
            if user_state:
                st.json(user_state)
                
                # Check if account exists
                if 'assetPositions' in user_state:
                    st.success("✅ Account exists on Hyperliquid Testnet")
                else:
                    st.warning("⚠️ Account structure unexpected")
            else:
                st.error("❌ Account does not exist on Hyperliquid Testnet. Please visit https://app.hyperliquid-testnet.xyz/ and make a deposit to register your wallet.")
        except Exception as e:
            st.error(f"Error fetching account state: {e}")
        
        st.markdown("---")
        st.subheader("Test Order Placement")
        
        col1, col2 = st.columns(2)
        with col1:
            coin = st.selectbox("Coin", ["SOL", "BTC", "ETH"])
            is_buy = st.checkbox("Buy", value=True)
            size = st.number_input("Size", min_value=0.001, value=1.0, step=0.001)
        
        with col2:
            limit_price = st.number_input("Limit Price", min_value=0.01, value=100.0, step=0.01)
            reduce_only = st.checkbox("Reduce Only", value=False)
        
        if st.button("Place Test Order"):
            with st.spinner("Placing order..."):
                try:
                    # Place order
                    order_result = exchange.order(
                        coin,
                        is_buy,
                        size,
                        limit_price,
                        {"limit": {"tif": "Ioc"}},  # Immediate or Cancel
                        reduce_only=reduce_only
                    )
                    
                    st.success("✅ Order placed successfully!")
                    st.json(order_result)
                    
                except Exception as e:
                    st.error(f"❌ Order placement failed: {e}")
                    st.exception(e)
        
    except Exception as e:
        st.error(f"Invalid private key: {e}")
