# Machine Learning 📊

- - -
## 1. 🧠 Kernkonzepte & Datengrundlagen
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| **Was ist der Unterschied zwischen parametrischem und nicht-parametrischem Lernen?** | - **Parametrisches Lernen** geht von einer **festen Struktur** des Modells aus (z.B. eine Linie in der Linearen Regression) und lernt nur die Koeffizienten.<br>- **Nicht-parametrisches Lernen** macht **keine Annahmen** über die Form der Funktion; die Komplexität des Modells wächst oft mit der Datenmenge (z.B. k-Nearest Neighbors). | 0 |
| **Wann wähle ich Regression, und wann Klassifikation?** | - **Regression** wählt man, wenn die Zielvariable **kontinuierlich** ist (z.B. Hauspreis, Temperatur, Umsatzvorhersage).<br>- **Klassifikation** wählt man, wenn die Zielvariable **diskret/kategorial** ist (z.B. Ja/Nein, Spam/Kein Spam, Tierart). | 0 |
| **Warum ist der Datensplit (Training/Validierung/Test) so wichtig?** | - Der Split stellt sicher, dass das Modell auf **unbekannten Daten** getestet wird (**Generalisierung**).<br>- Das **Validierungs-Set** dient der **Hyperparameter-Optimierung** und verhindert, dass das Modell auf das Test-Set "trainiert" wird (**Data Leakage**). | 0 |
| **Was ist der Bias-Variance Tradeoff?** | - Es ist der grundlegende Zielkonflikt in ML.<br>- **Hoher Bias** (einfaches Modell) führt zu **Underfitting** (Modell ist zu simpel).<br>- **Hohe Varianz** (komplexes Modell) führt zu **Overfitting** (Modell lernt Rauschen).<br>- Ziel ist es, die **Balance** zu finden, um den Gesamtfehler zu minimieren. | 0 |
| **Was ist der Unterschied zwischen Overfitting und Underfitting?** | - **Overfitting**: Modell passt sich zu stark den Trainingsdaten an, verliert die Generalisierungsfähigkeit.<br>- **Underfitting**: Modell ist zu einfach, um die zugrundeliegenden Muster zu erfassen. | 0 |
- - -
## 2. 🛠️ Präprozessierung & Feature Engineering
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| **Warum müssen kategoriale Daten (z.B. Farbe) kodiert werden?** | - ML-Algorithmen arbeiten nur mit **numerischen Werten**.<br>- Die Kodierung wandelt kategoriale Labels in ein numerisches Format um.<br>- Die gängigste Methode ist **One-Hot-Encoding**, um keine künstliche Reihenfolge zu erzeugen. | 0 |
| **Wofür wird die Skalierung (Standardisierung oder Normalisierung) der Features benötigt?** | - Sie verhindert, dass Features mit **großen Wertebereichen** (z.B. Gehalt) die Zielfunktion **dominieren**.<br>- Sie ist **obligatorisch** für Algorithmen, die auf **Distanzen** oder **Gradienten** basieren (z.B. KNN, SVM, Lineare Regression). | 0 |
| **Was ist Feature Selection und warum ist sie nützlich?** | - **Feature Selection** ist der Prozess der **Auswahl der relevantesten** Features aus dem Datensatz.<br>- Sie reduziert die **"Curse of Dimensionality"**, verbessert die **Interpretierbarkeit** und die **Trainingsgeschwindigkeit**. | 0 |
| **Was versteht man unter Feature Importance und Interpretierbarkeit?** | - **Feature Importance** bewertet, welche Eingabevariablen den größten Einfluss auf die Vorhersagen haben (z.B. Entscheidungsbäume, SHAP).<br>- Wichtig, um Modelle nachvollziehbar und vertrauenswürdig zu machen. | 0 |
- - -
## 3. 🏡 Algorithmen: Use Cases (Supervised Learning)
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| **Nennen Sie einen möglichen Use Case für die Lineare Regression.** | - **Use-Case:** Ein Immobilienmakler möchte den **Verkaufspreis** eines Hauses basierend auf seiner Größe (m²) vorhersagen.<br>- **Fokus:** Vorhersage eines kontinuierlichen Wertes mit klarem linearem Zusammenhang. | 0 |
| **Nennen Sie einen möglichen Use Case für die Lasso Regression (L1-Regularisierung).** | - **Use-Case:** Ein Finanzanalyst muss die **Kreditwürdigkeit** vorhersagen und gleichzeitig die **weniger wichtigen** Einflussfaktoren automatisch auf Null setzen.<br>- **Fokus:** Vorhersage *und* automatische, gleichzeitige Feature-Selektion. | 0 |
| **Nennen Sie einen möglichen Use Case für die Logistische Regression.** | - **Use-Case:** Ein Online-Shop möchte die **Kaufwahrscheinlichkeit** (Ja/Nein) eines Kunden vorhersagen.<br>- **Fokus:** Binäre Klassifikation und Wahrscheinlichkeitsberechnung. | 0 |
| **Nennen Sie einen möglichen Use Case für K-Nearest Neighbors (KNN).** | - **Use-Case:** Ein Musikdienst muss einen **neuen Song** kategorisieren, indem er schaut, zu welchen **5 ähnlichsten** (nächsten) Songs in seiner Datenbank er passt.<br>- **Fokus:** Klassifikation basierend auf Ähnlichkeit/Distanz zu Trainingsdaten. | 0 |
| **Nennen Sie einen möglichen Use Case für die Support Vector Machine (SVM).** | - **Use-Case:** Ein Krebsforscher möchte in einem hochdimensionalen Genexpressionsdatensatz die **optimale Trennebene** finden, um gesunde und kranke Zellen zu separieren.<br>- **Fokus:** Effektive Klassifikation in komplexen, hochdimensionalen Räumen. | 0 |
- - -
## 4. 🔍 Algorithmen: Use Cases (Unsupervised Learning)
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| **Nennen Sie einen möglichen Use Case für K-Means Clustering.** | - **Use-Case:** Ein Marketing-Team muss Kunden basierend auf ihrem Kaufverhalten in **3 klare, definierte Segmente** gruppieren.<br>- **Fokus:** Gruppierung von Datenpunkten in eine **vorher definierte Anzahl (K)** von Clustern. | 0 |
| **Nennen Sie einen möglichen Use Case für DBSCAN Clustering.** | - **Use-Case:** Ein Sicherheitsteam sucht nach unregelmäßigen **Netzwerkzugriffen** (**Rauschen/Anomalien**) in einem großen Log-Datensatz.<br>- **Fokus:** Dichtebasiertes Clustering zur Erkennung von Clustern beliebiger Form und zur **Identifikation von Ausreißern**. | 0 |
| **Nennen Sie einen möglichen Use Case für die Principal Component Analysis (PCA).** | - **Use-Case:** Ein Ingenieur muss 100 hochkorrelierte Features auf die **3 wichtigsten** reduzieren, um die Trainingszeit zu verkürzen, ohne viel Varianz zu verlieren.<br>- **Fokus:** Dimensionsreduktion zur **Komprimierung** von Daten unter Beibehaltung der maximalen Varianz. | 0 |
- - -
## 5. 📏 Evaluation und Fehlervermeidung
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| **Was ist der Unterschied zwischen Precision und Recall?** | - **Precision (Präzision):** Fragt: "Von allen vom Modell als positiv **vorhergesagten** Fällen, wie viele waren korrekt?" (**Fokus auf Falsch-Positive vermeiden**).<br>- **Recall (Sensitivität):** Fragt: "Von allen tatsächlich **positiven** Fällen, wie viele hat das Modell erkannt?" (**Fokus auf Falsch-Negative vermeiden**). | 0 |
| **Wann ist der F1 Score nützlicher als die reine Accuracy?** | - Der F1 Score ist das **harmonische Mittel** aus Precision und Recall.<br>- Er ist besonders nützlich bei **Klassen-Imbalance**, da er schlechte Performance in der Minderheitsklasse strenger bestraft als die einfache Accuracy. | 0 |
| **Was ist Data Leakage und wie kann man es verhindern?** | - **Data Leakage** tritt auf, wenn Informationen aus dem **Test-Set** unbeabsichtigt in das **Training** gelangen.<br>- Es führt zu unrealistisch **optimistischen** Performance-Metriken.<br>- Verhinderung: Die gesamte **Preprocessing-Pipeline** (Skalierung, Imputation) muss auf dem Training Set **gelernt** und erst dann auf das Test Set **angewendet** werden. | 0 |
| **Was ist der Sinn von Ensemble Learning?** | - **Ensemble Learning** kombiniert die Vorhersagen **mehrerer Einzelmodelle** (schwacher Lerner), um die Gesamtgenauigkeit zu verbessern.<br>- Die Fehler eines einzelnen Modells werden durch die Stärken anderer Modelle ausgeglichen, was zu **stabileren** und **robusteren** Ergebnissen führt. | 0 |
| **Was ist Modell-Drift und warum ist Monitoring wichtig?** | - **Modell-Drift** tritt auf, wenn sich die Datenverteilung im Laufe der Zeit ändert (z.B. Kundenverhalten, Marktbedingungen).<br>- Folgen: Modell verliert an Genauigkeit.<br>- Lösung: Regelmäßiges **Monitoring** und Retraining mit neuen Daten. | 0 |
- - -
## 6. 🌍 Vertiefende Themen
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| **Was ist Reinforcement Learning und wo wird es eingesetzt?** | - Ein **Agent** interagiert mit einer **Umgebung**, um durch Belohnungen eine optimale Strategie (Policy) zu lernen.<br>- Anwendungen: Robotik, Spielintelligenz (z.B. AlphaGo), dynamische Ressourcenallokation. | 0 |
| **Wie kann man Unsicherheit in Vorhersagen quantifizieren?** | - Klassische ML-Modelle liefern oft nur **Punktvorhersagen**.<br>- Probabilistische Ansätze (z.B. Bayes’sche Modelle) geben eine **Unsicherheitsschätzung** aus.<br>- Nützlich für kritische Anwendungen (z.B. Medizin, Finanzen). | 0 |
| **Warum ist Fairness und Bias im Machine Learning ein Thema?** | - Trainingsdaten können **gesellschaftliche Verzerrungen** enthalten.<br>- ML-Modelle reproduzieren oder verstärken diese.<br>- Fairness-Strategien: Balanced Datasets, Fairness-Metriken (z.B. Equal Opportunity), Bias-Korrektur. | 0 |
- - -
