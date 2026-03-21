# Cost of Mid-Tier Customer Neglect - RFM Analysis

![Python](https://img.shields.io/badge/Python-3.12-blue.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-App-red.svg)
![Jupyter](https://img.shields.io/badge/Jupyter-Notebooks-orange.svg)
![Status](https://img.shields.io/badge/Status-Completed-success.svg)

## 📌 Overview
Customer segmentation is widely used by organizations to identify valuable customers and optimize marketing strategies. However, mid-tier customers are frequently overlooked under the assumption that they are stable contributors. 

This Business Analytics project investigates the hidden cost associated with neglecting these mid-tier customers using **Recency, Frequency, and Monetary (RFM) analysis**. Using real-world e-commerce transaction data (UCI Online Retail dataset), we segment customers, analyze their churn rates, and quantify the massive opportunity cost of mid-tier neglect.

## 📊 Key Findings
- **Revenue Contribution:** Mid-tier customers collectively contribute **37.4%** of total revenue (£3.33 million).
- **Churn Rate Disparity:** Mid-tier customers experience churn rates **1.8 to 2.5 times higher** than high-value customers.
- **Cost of Neglect:** The estimated revenue lost due to unaddressed mid-tier churn exceeds **£2.28 million** over a 13-month period.

## 📂 Project Structure
- `data/`: Contains raw and processed datasets (ignored by git due to size).
- `notebooks/`: Jupyter notebooks containing exploratory data analysis (EDA), RFM calculation, cohort analysis, and data preprocessing.
- `dashboard/`: A React/Vite frontend analytical dashboard.
- `src/`: Reusable Python scripts and modules.
- `app.py`: A fully interactive **Streamlit Dashboard** visualizing segment distributions, retention matrices, and churn patterns.

## ⚙️ Setup Instructions & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dheeraj-74/Cost-of-Mid-Tier-Customer-Neglect-RFM.git
   cd Cost-of-Mid-Tier-Customer-Neglect-RFM
   ```

2. **Create and activate a virtual environment:**
   - **Windows:** 
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **Mac/Linux:** 
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Streamlit Web Application:**
   To view the visualizations and interact with the mid-tier analysis dashboard:
   ```bash
   streamlit run app.py
   ```
   *The dashboard will automatically open in your browser at `http://localhost:8501`.*

5. **Start exploring the raw data:** 
   Place your dataset in the `data/` folder and open the Jupyter Notebooks to view the mathematical RFM logic.

---
*Created as part of 23CSE452 – Business Analytics.*
