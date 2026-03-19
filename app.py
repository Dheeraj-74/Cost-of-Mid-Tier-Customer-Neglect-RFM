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
    # Load previously exported Tableau segmented datasets to bypass missing raw data
    df_segmented = pd.read_csv('notebooks/tableau_transactions_segmented.csv')
    rfm = pd.read_csv('notebooks/tableau_rfm_customers.csv', index_col=0)
    
    # Preprocessing to restore datatypes
    df_segmented['InvoiceDate'] = pd.to_datetime(df_segmented['InvoiceDate'], errors='coerce')
    df_segmented['YearMonth'] = pd.to_datetime(df_segmented['YearMonth']).dt.to_period('M')
    df_segmented['YearMonthStr'] = df_segmented['YearMonth'].astype(str)
    
    # Ensure Extended_Segment remains categorical for warnings 
    df_segmented['Extended_Segment'] = pd.Categorical(df_segmented['Extended_Segment'], categories=SEGMENT_ORDER, ordered=True)
    rfm['Extended_Segment'] = pd.Categorical(rfm['Extended_Segment'], categories=SEGMENT_ORDER, ordered=True)
    
    return df_segmented, rfm

with st.spinner('Loading processed data...'):
    df_segmented, rfm = load_and_preprocess_data()
    # Mock df using df_segmented to power remaining plots seamlessly
    df = df_segmented  

# Side bar for navigation
st.sidebar.title("Navigation")
st.sidebar.markdown("---")
# Clean names for nav without emojis
nav = st.sidebar.radio("Go to Section", [
    "Business Summary", 
    "Customer & Revenue Overview", 
    "Retention & Migration", 
    "Mid-Tier Analysis"
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

if nav == "Business Summary":
    st.header("Executive Summary")
    
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

    st.markdown("### Top 10 Products by Revenue (Mid-Tier)")
    mid_tier_txns = df_segmented[df_segmented['Extended_Segment'].isin(['M1', 'M2', 'M3'])]
    top_products = (
        mid_tier_txns.groupby('Description', observed=False)['TotalPrice']
        .sum()
        .nlargest(10)
        .sort_values()
    )

    fig11, ax11 = plt.subplots(figsize=(10, 5))
    top_products.plot(kind='barh', ax=ax11, color='#6BAA75', edgecolor='white')
    ax11.set_title('Top 10 Products by Revenue — Mid-Tier Customers (M1+M2+M3)', fontsize=13)
    ax11.set_xlabel('Total Revenue (£)')
    ax11.set_ylabel('Product Description')
    ax11.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    st.pyplot(fig11)

elif nav == "Customer & Revenue Overview":
    st.header("Customer & Revenue Overview")
    
    t1, t2 = st.tabs(["Revenue Metrics", "Customer Base Metrics"])
    
    with t1:
        st.subheader("Monthly Revenue Contribution by Customer Segment")
        fig4, ax4 = plt.subplots(figsize=(12, 5))
        bottom = np.zeros(len(monthly_segment_revenue))
        for seg in SEGMENT_ORDER:
            ax4.bar(
                monthly_segment_revenue.index,
                monthly_segment_revenue[seg],
                bottom=bottom,
                label=seg,
                color=PALETTE[seg]
            )
            bottom += monthly_segment_revenue[seg].values

        ax4.set_xlabel('Month')
        ax4.set_ylabel('Revenue (£)')
        ax4.tick_params(axis='x', rotation=45)
        ax4.legend(title='Segment', bbox_to_anchor=(1.01, 1), loc='upper left')
        ax4.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        st.pyplot(fig4)

        st.subheader("Average Order Value (AOV) Trend Over Time")
        df_aov = df.copy()
        df_aov['Month'] = df_aov['InvoiceDate'].dt.to_period('M').astype(str)
        invoice_totals = df_aov.groupby(['InvoiceNo', 'Month'], observed=False)['TotalPrice'].sum().reset_index()
        aov_trend = invoice_totals.groupby('Month', observed=False)['TotalPrice'].mean().reset_index()

        fig1, ax1 = plt.subplots(figsize=(12, 5))
        sns.lineplot(data=aov_trend, x='Month', y='TotalPrice', marker='o', color='b', linewidth=2, ax=ax1)
        ax1.set_xlabel('Month')
        ax1.set_ylabel('Average Order Value ($)')
        ax1.tick_params(axis='x', rotation=45)
        ax1.grid(True, linestyle='--', alpha=0.6)
        st.pyplot(fig1)

    with t2:
        colA, colB = st.columns(2)
        with colA:
            st.subheader("Customer Segment Distribution (3-Tier)")
            segment_counts = rfm['Customer_Segment'].value_counts()
            fig3, ax3 = plt.subplots(figsize=(6, 4))
            segment_counts.plot(kind='bar', ax=ax3, color=['#4E6B8C', '#E8A838', '#7B5EA7'], edgecolor='white')
            ax3.set_xlabel('Segment')
            ax3.set_ylabel('Customer Count')
            ax3.tick_params(axis='x', rotation=0)
            st.pyplot(fig3)
        
        with colB:
            st.subheader("RFM Score Distribution by Segment")
            rfm_plot = rfm[['R_score', 'F_score', 'M_score', 'Extended_Segment']].copy()
            rfm_plot[['R_score', 'F_score', 'M_score']] = rfm_plot[['R_score', 'F_score', 'M_score']].astype(float)
            
            fig9, axes = plt.subplots(1, 3, figsize=(10, 4), sharey=False)
            for ax, score, label in zip(axes, ['R_score', 'F_score', 'M_score'], ['Recency', 'Frequency', 'Monetary']):
                sns.boxplot(
                    data=rfm_plot,
                    x='Extended_Segment', 
                    hue='Extended_Segment',
                    y=score,
                    order=SEGMENT_ORDER,
                    palette=PALETTE,
                    ax=ax,
                    legend=False
                )
                ax.set_title(label)
                ax.set_xlabel('')
                ax.set_ylabel('Score' if ax == axes[0] else '')
            st.pyplot(fig9)
            
        st.subheader("Customer Count per Segment Over Time")
        fig5, ax5 = plt.subplots(figsize=(12, 4))
        for seg in SEGMENT_ORDER:
            ax5.plot(monthly_segment_customers.index, monthly_segment_customers[seg],
                    marker='o', label=seg, color=PALETTE[seg], linewidth=2)
        ax5.set_xlabel('Month')
        ax5.set_ylabel('Unique Customers')
        ax5.tick_params(axis='x', rotation=45)
        ax5.legend(title='Segment')
        st.pyplot(fig5)

elif nav == "Retention & Migration":
    st.header("Retention & Segment Migration")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Segment Migration Heatmap")
        st.markdown("Shows customer migration across segments in consecutive months.")
        fig7, ax7 = plt.subplots(figsize=(7, 5))
        sns.heatmap(migration_matrix.astype(int), annot=True, fmt='d', cmap='Blues',
                    linewidths=0.5, ax=ax7)
        ax7.set_xlabel('Segment (To)')
        ax7.set_ylabel('Segment (From)')
        st.pyplot(fig7)
        
    with col2:
        st.subheader("Customer Cohort Retention")
        df_cohort = df.copy()
        df_cohort['InvoiceMonth'] = df_cohort['InvoiceDate'].dt.to_period('M').dt.to_timestamp()
        df_cohort['CohortMonth'] = df_cohort.groupby('CustomerID', observed=False)['InvoiceMonth'].transform('min')

        def get_date_int(dframe, column):
            return dframe[column].dt.year, dframe[column].dt.month

        invoice_year, invoice_month = get_date_int(df_cohort, 'InvoiceMonth')
        cohort_year, cohort_month = get_date_int(df_cohort, 'CohortMonth')

        df_cohort['CohortIndex'] = (invoice_year - cohort_year) * 12 + (invoice_month - cohort_month) + 1 

        cohort_data = df_cohort.groupby(['CohortMonth', 'CohortIndex'], observed=False)['CustomerID'].nunique().reset_index()
        cohort_counts = cohort_data.pivot(index='CohortMonth', columns='CohortIndex', values='CustomerID')
        retention = cohort_counts.divide(cohort_counts.iloc[:, 0], axis=0)
        retention.index = retention.index.strftime('%Y-%m')

        fig2, ax2 = plt.subplots(figsize=(8, 5))
        sns.heatmap(
            retention, annot=False, cmap='YlOrRd', ax=ax2
        )
        ax2.set_xlabel('Months Since First Purchase')
        ax2.set_ylabel('Cohort (Month of First Purchase)')
        st.pyplot(fig2)

elif nav == "Mid-Tier Analysis":
    st.header("Mid-Tier Analysis Focus")
    st.markdown("Understanding churn and downgrade behaviors within the middle tiers.")
    
    t1, t2 = st.tabs(["Churn Trends", "Average Revenue Impact"])
    with t1:
        st.subheader("Mid-Tier Churn Rate Over Time (M1/M2/M3 → L or Inactive)")
        fig8, ax8 = plt.subplots(figsize=(10, 4))
        ax8.plot(churn_df['Month'], churn_df['ChurnRate'], marker='o', color='#D46A6A', linewidth=2.5)
        ax8.fill_between(churn_df['Month'], churn_df['ChurnRate'], alpha=0.15, color='#D46A6A')
        ax8.set_xlabel('Month')
        ax8.set_ylabel('Churn Rate (%)')
        ax8.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'{x:.1f}%'))
        ax8.tick_params(axis='x', rotation=45)
        st.pyplot(fig8)

        st.subheader("Estimated Revenue Lost to Mid-Tier Downgrade per Month")
        fig10, ax10 = plt.subplots(figsize=(10, 4))
        ax10.bar(revenue_lost_df['Month'], revenue_lost_df['RevenueLost'], color='#D46A6A', edgecolor='white')
        ax10.set_xlabel('Month')
        ax10.set_ylabel('Estimated Revenue Lost (£)')
        ax10.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        ax10.tick_params(axis='x', rotation=45)
        st.pyplot(fig10)
        
    with t2:
        st.subheader("Average Revenue per Customer by Segment")
        avg_rev_per_customer = monthly_segment_revenue / monthly_segment_customers.replace(0, np.nan)
        fig6, ax6 = plt.subplots(figsize=(10, 5))
        for seg in SEGMENT_ORDER:
            ax6.plot(avg_rev_per_customer.index, avg_rev_per_customer[seg],
                    marker='s', label=seg, color=PALETTE[seg], linewidth=2)
        ax6.set_xlabel('Month')
        ax6.set_ylabel('Avg Revenue per Customer (£)')
        ax6.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        ax6.tick_params(axis='x', rotation=45)
        ax6.legend(title='Segment')
        st.pyplot(fig6)
