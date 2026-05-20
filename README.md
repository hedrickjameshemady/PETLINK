PETLINK: Pet Management, Adoption System, and Lost & Found
PETLINK is a centralized web-based system designed to streamline pet shelter operations and improve the adoption process. It also integrates a Lost & Found module, allowing users to report missing pets and help reunite them with their owners.
The platform enables users to browse available pets, submit adoption requests, and report lost or found animals. Administrators are provided with tools to efficiently manage pet records, adoption workflows, and user submissions in a structured and organized manner.
Tech Stack

Frontend: React.js (Vite)
Backend: Node.js / Express
Database: MySQL
Tools: GitHub, Visual Studio Code

Installation Guide
1. Clone the Repository
git clone https://github.com/hedrickjameshemady/PETLINK.git
2. Navigate to the Project Directory
cd PETLINK
3. Install Backend Dependencies
cd backend then npm install
4. Install Frontend Dependencies
cd ../frontend then npm install
5. Configure Environment Variables
Copy .env.example to .env and fill in your MySQL credentials.
6. Set Up the Database
Import the schema: mysql -u your_username -p petlink < database/schema.sql
7. Run the Application
Backend: npm start | Frontend: npm run dev
8. Access the System
Open your browser and go to http://localhost:5173
Key Features

🐶 Pet listing and adoption system
📄 Online adoption request submission
🔍 Lost and found pet reporting
🛠️ Admin dashboard for full system management
📊 Organized record tracking and monitoring

Contributors

Kate Franzen O. Mien – Project Manager & Main Developer
Hedrick James D. Hemady – Main UX/UI Designer & Documentation
Paul Jude Polinag – Lead Developer & Documentation Manager
Maynard Andobuenaventura – Lead UX/UI Designer & Documentation