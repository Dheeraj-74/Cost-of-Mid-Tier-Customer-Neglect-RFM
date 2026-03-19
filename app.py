import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import numpy as np
import datetime as dt

st.set_page_config(page_title="Cost of Mid-Tier Customer Neglect", layout="wide", initial_sidebar_state="expanded")

PALETTE = {
    'L':  '#4E6B8C',
    'M1': '#6BAA75',
    'M2': '#E8A838',
    'M3': '#D46A6A',
    'H':  '#7B5EA7',
}
SEGMENT_ORDER = ['L', 'M1', 'M2', 'M3', 'H']

# Optimize loading data using st.cache_data
@st.cache_data
def load_and_preprocess_data():
    df_segmented = pd.read_csv('notebooks/tableau_transactions_segmented.csv')
    rfm = pd.read_csv('notebooks/tableau_rfm_customers.csv', index_col=0)
    
    df_segmented['InvoiceDate'] = pd.to_datetime(df_segmented['InvoiceDate'], errors='coerce')
    df_segmented['YearMonth'] = pd.to_datetime(df_segmented['YearMonth']).dt.to_period('M')
    df_segmented['YearMonthStr'] = df_segmented['YearMonth'].astype(str)
    
    df_segmented['Extended_Segment'] = pd.Categorical(df_segmented['Extended_Segment'], categories=SEGMENT_ORDER, ordered=True)
    rfm['Extended_Segment'] = pd.Categorical(rfm['Extended_Segment'], categories=SEGMENT_ORDER, ordered=True)
    
    return df_segmented, rfm

with st.spinner('Loading processed data...'):
    df_segmented, rfm = load_and_preprocess_data()
    df = df_segmented  

st.sidebar.title("Navigation")
st.sidebar.markdown("---")
nav = st.sidebar.selectbox("Jump to Section:", [
    "Customer & Revenue Overview", 
    "Retention & Migration", 
    "Mid-Tier Analysis",
    "Business Summary"
])

st.title("Cost of Mid-Tier Customer Neglect")
st.markdown("### RFM Analysis Dashboard")
st.markdown("---")

# Pre-calculate main data
@st.cache_data
def calculate_segment_metrics(df_segmented):
    monthly_segment_revenue = (
        df_segmented
        .groupby(['YearMonthStr', 'Extended_Segment'], observed=False)['TotalPrice']
        .sum()
        .unstack()
        .reindex(columns=SEGMENT_ORDER, fill_value=0)
    )
    
    monthly_segment_customers = (
        df_segmented
        .groupby(['YearMonthStr', 'Extended_Segment'], observed=False)['CustomerID']
        .nunique()
        .unstack()
        .reindex(columns=SEGMENT_ORDER, fill_value=0)
    )
    
    return monthly_segment_revenue, monthly_segment_customers

monthly_segment_revenue, monthly_segment_customers = calculate_segment_metrics(df_segmented)
months = monthly_segment_customers.index.tolist()

@st.cache_data
def calculate_migration_and_churn(df_segmented, months):
    migration_matrix = pd.DataFrame(0, index=SEGMENT_ORDER, columns=SEGMENT_ORDER, dtype=float)
    MID_TIERS = ['M1', 'M2', 'M3']
    churn_rates = []
    revenue_lost_list = []
    
    dict_months = dict(tuple(df_segmented.groupby('YearMonthStr', observed=False)))

    for i in range(len(months) - 1):
        m_from, m_to = months[i], months[i + 1]
        df_from = dict_months.get(m_from, pd.DataFrame())
        df_to = dict_months.get(m_to, pd.DataFrame())
        
        # Migration
        cust_from = df_from[['CustomerID', 'Extended_Segment']].drop_duplicates()
        cust_to   = df_to[['CustomerID', 'Extended_Segment']].drop_duplicates()
        if not cust_from.empty and not cust_to.empty:
            merged = cust_from.merge(cust_to, on='CustomerID', suffixes=('_from', '_to'))
            for _, row in merged.iterrows():
                seg_f = str(row['Extended_Segment_from'])
                seg_t = str(row['Extended_Segment_to'])
                if seg_f in SEGMENT_ORDER and seg_t in SEGMENT_ORDER:
                    migration_matrix.loc[seg_f, seg_t] += 1
                
        # Churn
        mid_from = df_from[df_from['Extended_Segment'].isin(MID_TIERS)][['CustomerID', 'Extended_Segment', 'TotalPrice']].copy()
        active_next = df_to[['CustomerID', 'Extended_Segment']].drop_duplicates()
        
        mid_ids = mid_from[['CustomerID', 'Extended_Segment']].drop_duplicates()
        if not mid_ids.empty:
            merged_churn = mid_ids.merge(active_next, on='CustomerID', suffixes=('_from', '_to'), how='left')
            churned = merged_churn[
                merged_churn['Extended_Segment_to'].isna() |
                (merged_churn['Extended_Segment_to'] == 'L')
            ]
            
            rate = len(churned) / len(mid_ids) * 100
            churn_rates.append({'Month': m_to, 'ChurnRate': rate})
            
            # Revenue Lost setup
            avg_rev_df = mid_from.groupby(['CustomerID', 'Extended_Segment'], observed=False)['TotalPrice'].sum().reset_index()
            avg_rev_by_seg = avg_rev_df.groupby('Extended_Segment', observed=False)['TotalPrice'].mean().to_dict()
            
            lost = sum(
                avg_rev_by_seg.get(str(row['Extended_Segment_from']), 0)
                for _, row in churned.iterrows()
            )
            revenue_lost_list.append({'Month': m_to, 'RevenueLost': lost})
        else:
            churn_rates.append({'Month': m_to, 'ChurnRate': 0})
            revenue_lost_list.append({'Month': m_to, 'RevenueLost': 0})

    churn_df = pd.DataFrame(churn_rates)
    revenue_lost_df = pd.DataFrame(revenue_lost_list)
    return migration_matrix, churn_df, revenue_lost_df

migration_matrix, churn_df, revenue_lost_df = calculate_migration_and_churn(df_segmented, months)


if nav == "Customer & Revenue Overview":
    st.header("Customer & Revenue Overview")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Customer Segment Distribution (3-Tier)")
        st.caption("Gives overall customer base structure.")
        segment_counts = rfm['Customer_Segment'].value_counts()
        fig1, ax1 = plt.subplots(figsize=(6, 4))
        segment_counts.plot(kind='bar', ax=ax1, color=['#4E6B8C', '#E8A838', '#7B5EA7'], edgecolor='white')
        ax1.set_xlabel('Segment')
        ax1.set_ylabel('Customer Count')
        ax1.tick_params(axis='x', rotation=0)
        st.pyplot(fig1)

    with col2:
        st.subheader("Customer Count per Segment Over Time")
        st.caption("Shows growth/decline of customer base.")
        fig2, ax2 = plt.subplots(figsize=(8, 4))
        for seg in SEGMENT_ORDER:
            ax2.plot(monthly_segment_customers.index, monthly_segment_customers[seg],
                    marker='o', label=seg, color=PALETTE[seg], linewidth=2)
        ax2.set_xlabel('Month')
        ax2.set_ylabel('Unique Customers')
        ax2.tick_params(axis='x', rotation=45)
        ax2.legend(title='Segment')
        st.pyplot(fig2)
        
    st.markdown("---")
    col3, col4 = st.columns(2)
    
    with col3:
        st.subheader("Monthly Revenue Contribution by Segment")
        st.caption("Shows who generates revenue.")
        fig3, ax3 = plt.subplots(figsize=(8, 5))
        bottom = np.zeros(len(monthly_segment_revenue))
        for seg in SEGMENT_ORDER:
            ax3.bar(
                monthly_segment_revenue.index,
                monthly_segment_revenue[seg],
                bottom=bottom,
                label=seg,
                color=PALETTE[seg]
            )
            bottom += monthly_segment_revenue[seg].values

        ax3.set_xlabel('Month')
        ax3.set_ylabel('Revenue (£)')
        ax3.tick_params(axis='x', rotation=45)
        ax3.legend(title='Segment')
        ax3.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        st.pyplot(fig3)

    with col4:
        st.subheader("Average Revenue per Customer by Segment")
        st.caption("Measures customer value.")
        avg_rev_per_customer = monthly_segment_revenue / monthly_segment_customers.replace(0, np.nan)
        fig4, ax4 = plt.subplots(figsize=(8, 5))
        for seg in SEGMENT_ORDER:
            ax4.plot(avg_rev_per_customer.index, avg_rev_per_customer[seg],
                    marker='s', label=seg, color=PALETTE[seg], linewidth=2)
        ax4.set_xlabel('Month')
        ax4.set_ylabel('Avg Revenue per Customer (£)')
        ax4.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        ax4.tick_params(axis='x', rotation=45)
        ax4.legend(title='Segment')
        st.pyplot(fig4)


elif nav == "Retention & Migration":
    st.header("Retention & Migration")
    st.subheader("Segment Migration Heatmap")
    st.caption("Directly shows retention (diagonal), downgrade (towards L), and upgrade (towards H).")
    fig1, ax1 = plt.subplots(figsize=(10, 6))
    sns.heatmap(migration_matrix.astype(int), annot=True, fmt='d', cmap='Blues',
                linewidths=0.5, ax=ax1)
    ax1.set_xlabel('Segment (To)')
    ax1.set_ylabel('Segment (From)')
    st.pyplot(fig1)
    
    st.markdown("---")
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Mid-Tier Churn Rate")
        st.caption("Customers leaving mid-tier (Measures loss of customers).")
        fig2, ax2 = plt.subplots(figsize=(8, 4))
        ax2.plot(churn_df['Month'], churn_df['ChurnRate'], marker='o', color='#D46A6A', linewidth=2.5)
        ax2.fill_between(churn_df['Month'], churn_df['ChurnRate'], alpha=0.15, color='#D46A6A')
        ax2.set_xlabel('Month')
        ax2.set_ylabel('Churn Rate (%)')
        ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'{x:.1f}%'))
        ax2.tick_params(axis='x', rotation=45)
        st.pyplot(fig2)

    with col2:
        st.subheader("Revenue Lost to Downgrade (Mid → L)")
        st.caption("Monthly revenue loss (Measures financial impact of churn).")
        fig3, ax3 = plt.subplots(figsize=(8, 4))
        ax3.bar(revenue_lost_df['Month'], revenue_lost_df['RevenueLost'], color='#D46A6A', edgecolor='white')
        ax3.set_xlabel('Month')
        ax3.set_ylabel('Estimated Revenue Lost (£)')
        ax3.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        ax3.tick_params(axis='x', rotation=45)
        st.pyplot(fig3)


elif nav == "Mid-Tier Analysis":
    st.header("Mid-Tier Analysis (MAIN FOCUS)")
    
    st.subheader("Top 10 Products by Mid-Tier Revenue")
    st.caption("Products preferred by M1/M2/M3 (Shows behavior of mid-tier customers).")
    mid_tier_txns = df_segmented[df_segmented['Extended_Segment'].isin(['M1', 'M2', 'M3'])]
    top_products = (
        mid_tier_txns.groupby('Description', observed=False)['TotalPrice']
        .sum()
        .nlargest(10)
        .sort_values()
    )
    fig1, ax1 = plt.subplots(figsize=(10, 5))
    top_products.plot(kind='barh', ax=ax1, color='#6BAA75', edgecolor='white')
    ax1.set_xlabel('Total Revenue (£)')
    ax1.set_ylabel('Product Description')
    ax1.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    st.pyplot(fig1)
    
    st.markdown("---")
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Revenue Lost to Downgrade")
        st.caption("Mid → L revenue drop (Core problem: mid-tier decline).")
        fig2, ax2 = plt.subplots(figsize=(8, 4))
        ax2.bar(revenue_lost_df['Month'], revenue_lost_df['RevenueLost'], color='#D46A6A', edgecolor='white')
        ax2.set_xlabel('Month')
        ax2.set_ylabel('Estimated Revenue Lost (£)')
        ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        ax2.tick_params(axis='x', rotation=45)
        st.pyplot(fig2)

    with col2:
        st.subheader("Mid-Tier Churn Rate")
        st.caption("Leaving customers (Measures mid-tier instability).")
        fig3, ax3 = plt.subplots(figsize=(8, 4))
        ax3.plot(churn_df['Month'], churn_df['ChurnRate'], marker='o', color='#D46A6A', linewidth=2.5)
        ax3.fill_between(churn_df['Month'], churn_df['ChurnRate'], alpha=0.15, color='#D46A6A')
        ax3.set_xlabel('Month')
        ax3.set_ylabel('Churn Rate (%)')
        ax3.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'{x:.1f}%'))
        ax3.tick_params(axis='x', rotation=45)
        st.pyplot(fig3)


elif nav == "Business Summary":
    st.header("Business Summary")
    
    @st.cache_data
    def calculate_summary(monthly_segment_revenue, df_segmented, months):
        total_revenue_by_seg = monthly_segment_revenue.sum()
        avg_monthly_by_seg   = monthly_segment_revenue.mean()
        peak_month_by_seg    = monthly_segment_revenue.idxmax()

        churn_by_seg = {seg: [] for seg in SEGMENT_ORDER}
        dict_months = dict(tuple(df_segmented.groupby('YearMonthStr', observed=False)))
        
        for i in range(len(months) - 1):
            m_from, m_to = months[i], months[i + 1]
            df_from = dict_months.get(m_from, pd.DataFrame())
            df_to = dict_months.get(m_to, pd.DataFrame())
            
            if df_to.empty:
                seg_to = {}
            else:
                seg_to = df_to.groupby('CustomerID', observed=False)['Extended_Segment'].first().to_dict()
            
            for seg in SEGMENT_ORDER:
                if df_from.empty:
                    churn_by_seg[seg].append(0)
                    continue
                seg_from = df_from[df_from['Extended_Segment'] == seg]['CustomerID'].unique()
                if len(seg_from) == 0:
                    continue
                churned_count = sum(
                    1 for cid in seg_from
                    if cid not in seg_to or seg_to[cid] == 'L'
                )
                churn_by_seg[seg].append(churned_count / len(seg_from) * 100)

        avg_churn_by_seg = {seg: (np.mean(v) if v else 0.0) for seg, v in churn_by_seg.items()}
        total_rev_all = total_revenue_by_seg.sum()
        
        summary_df = pd.DataFrame({
            'Total Revenue (£)':     total_revenue_by_seg.map(lambda x: f'£{x:,.0f}'),
            'Avg Monthly Revenue (£)': avg_monthly_by_seg.map(lambda x: f'£{x:,.0f}'),
            'Peak Month':            peak_month_by_seg,
            'Avg Churn Rate (%)':    pd.Series(avg_churn_by_seg).map(lambda x: f'{x:.1f}%'),
            '% of Total Revenue':   (total_revenue_by_seg / total_rev_all * 100).map(lambda x: f'{x:.1f}%')
        })
        summary_df.index.name = 'Segment'
        return summary_df, total_revenue_by_seg.sum()

    with st.spinner('Calculating summary...'):
        summary_df, total_rev_all = calculate_summary(monthly_segment_revenue, df_segmented, months)

    col1, col2, col3 = st.columns(3)
    mid_rev = monthly_segment_revenue[['M1', 'M2', 'M3']].sum().sum()
    total_rev_lost = revenue_lost_df['RevenueLost'].sum()

    col1.metric("Total Mid-Tier (M1-M3) Revenue", f"£{mid_rev:,.0f}")
    col2.metric("Total Est. Revenue Lost (Churn)", f"£{total_rev_lost:,.0f}")
    col3.metric("Mid-Tier % of Total Revenue", f"{mid_rev / total_rev_all * 100:.1f}%")

    st.markdown("### Segment Summary Table")
    st.dataframe(summary_df)
