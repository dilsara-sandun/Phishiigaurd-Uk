# PhishGuard UK

PhishGuard UK is a system designed to detect phishing links and emails using a combination of machine learning models and deep contextual features. 

Below is a detailed breakdown of the **Prototype Implementation** and the **Model Development and Evaluation** phases, including the complete tech stack.

---

## 1. Prototype Implementation & Tech Stack

The prototype is built using a modern, scalable, and modular architecture, separating the client-side interface, the server-side logic, and the machine-learning engine.

### Frontend (Client-Side)
The frontend is designed to be highly responsive and interactive, providing security dashboards and reporting interfaces.
*   **Framework:** **React.js** (bootstrapped with **Vite** for fast hot-module reloading and optimized builds).
*   **Styling:** **Tailwind CSS** for rapid, utility-first UI design.
*   **Routing:** **React Router DOM** for seamless single-page application (SPA) navigation.
*   **Data Visualization:** **Recharts** is used for rendering dynamic charts (such as threat metrics, and SOC dashboard visualizations).
*   **HTTP Client:** **Axios** for handling secure API requests to the backend.
*   **Sanitization:** **DOMPurify** to protect against Cross-Site Scripting (XSS) when rendering user-submitted or AI-generated text.

### Backend (Server-Side)
The backend acts as the core orchestration layer, handling API requests, interacting with the database, and serving predictions from the ML models.
*   **Framework:** **FastAPI** paired with **Uvicorn**, providing a high-performance, asynchronous web server.
*   **Database & ORM:** **PostgreSQL** configured with **SQLAlchemy** (asyncio) and **asyncpg** for non-blocking database queries. **Alembic** manages schema migrations.
*   **Authentication:** **Bcrypt** and **python-jose** handle secure password hashing and JSON Web Token (JWT) generation for session management.
*   **Caching & Rate Limiting:** **Redis** is implemented for caching frequently accessed data, alongside **SlowAPI** to prevent brute-force and DDoS attacks.
*   **AI Integration:** **Google Generative AI** (`google-generativeai`) is integrated, powering dynamic threat-summary generation and automated SOC responses.
*   **DNS & URL Parsing:** Libraries like `dnspython`, `python-whois`, and `tldextract` extract deep contextual features from submitted URLs to feed into the machine learning models.

---

## 2. Model Development

The machine learning pipeline is housed in the `ml/` directory and is broken down into structured phases: data preparation, feature engineering, and model training.

### Data Preparation & Engineering
*   **Feature Extraction:** Scripts like `extract_features.py` break down URLs and emails into measurable features (e.g., URL length, domain age, presence of suspicious keywords).
*   **TF-IDF Vectorization:** (`tfidf_vectorizer.pkl`) Textual data (like email bodies) is transformed into numerical vectors using Term Frequency-Inverse Document Frequency to evaluate keyword significance.
*   **Handling Imbalanced Data:** We use **SMOTE** (Synthetic Minority Over-sampling Technique) during the training phase. Since phishing datasets usually have far fewer "phishing" examples than "legitimate" ones, SMOTE synthesizes new phishing examples to prevent the model from becoming biased toward predicting everything as safe.

### The Machine Learning Models
We implemented a multi-model approach to catch different types of attacks:
1.  **XGBoost Classifier (`xgb_model.pkl`):** 
    *   This is the primary tabular model for URL classification.
    *   **Hyperparameters:** Trained with 100 estimators (trees), a max depth of 6, and a learning rate of 0.1.
    *   **Advantage:** Highly accurate and extremely fast for real-time URL scanning.
2.  **LSTM Neural Network (`lstm_url_model.h5`):** 
    *   Built with **TensorFlow/Keras**, this Deep Learning model is designed to catch sequential anomalies in URLs (e.g., character-level patterns that XGBoost might miss).
3.  **Email Model (`email_model.pkl`):**
    *   A specialized NLP model designed to parse and classify raw email contents, working in tandem with the TF-IDF vectorizer.

### Model Explainability
*   **SHAP (`shap_explainer.pkl`):** We integrated SHapley Additive exPlanations. This is a crucial feature for a cybersecurity tool because it doesn't just output a "Phishing" or "Safe" label—it tells the user *why* (e.g., "Flagged because the domain age is 2 days old and the URL contains an IP address").

---

## 3. Model Evaluation

The training script (`02_train_model.py`) demonstrates a rigorous evaluation methodology to ensure the model performs accurately in a real-world scenario.

### Data Splitting Strategy
The dataset is split cleanly to avoid data leakage:
*   **70% Training Set:** Used to teach the model (with SMOTE applied).
*   **15% Validation Set:** Used during XGBoost training for "early stopping" to prevent the model from overfitting the training data.
*   **15% Test Set:** Unseen data used strictly for the final performance evaluation.

### Evaluation Metrics Calculated
Instead of relying purely on standard accuracy, the evaluation tracks robust cybersecurity metrics:
*   **Precision:** Out of all URLs flagged as phishing, how many were *actually* phishing? (Minimizes False Positives so users aren't annoyed by false alarms).
*   **Recall:** Out of all actual phishing attacks, how many did the model successfully catch? (Minimizes False Negatives, which are critical in security).
*   **F1-Score:** The harmonic mean of Precision and Recall, showing the overall balance of the model.
*   **ROC-AUC (Area Under Curve):** Measures the model's overall capacity to separate the Legitimate class from the Phishing class.
*   **Latency:** The script explicitly calculates inference speed in milliseconds (`latency_ms`). This ensures the model is fast enough to run in real-time without slowing down the user experience.

### Visual Outputs
Upon evaluation, the scripts automatically generate artifacts in the `ml/results/` folder:
1.  **Confusion Matrix (`confusion_matrix.png`):** A heatmap showing the exact number of True Positives, True Negatives, False Positives, and False Negatives.
2.  **ROC Curve (`roc_curve.png`):** A graphical plot showing the diagnostic ability of the binary classifier as its discrimination threshold is varied.
3.  **Feature Importance (`feature_importance.png`):** A bar chart of the Top 10 features the XGBoost model relied on most heavily (e.g., showing that "domain age" or "presence of hyphens" was the strongest indicator of a phishing link).
