const FIRST = ["Aarav","Priya","Rohan","Ananya","Vikram","Meera","Arjun","Kavya","Rahul","Divya","Sanjay","Neha","Amit","Pooja","Karan","Sunita","Rajesh","Anita","Manoj","Rekha","Suresh","Lakshmi","Deepak","Shalini","Naveen","Geeta","Ashok","Farhan","Ishaan","Zoya","Tarun","Nisha","Varun","Ritu","Harish","Sneha","Ganesh","Asha","Mukesh","Bina","Chandra","Durga","Eshan","Gauri","Kiran","Leela","Mohan","Nalini","Om","Padma"];

const LAST = [
  ["Sharma", "GENERAL"], ["Verma", "OBC"],  ["Patel", "GENERAL"], ["Iyer", "GENERAL"], ["Yadav", "OBC"],
  ["Reddy", "GENERAL"],  ["Mandal", "OBC"], ["Singh", "GENERAL"], ["Kumar", "GENERAL"], ["Das", "SC"],
  ["Sahu", "OBC"],       ["Joshi", "GENERAL"], ["Paswan", "SC"],  ["Bharti", "SC"],     ["Saroj", "SC"],
  ["Meena", "ST"],       ["Soren", "ST"],   ["Mishra", "GENERAL"], ["Murmu", "ST"],     ["Oraon", "ST"]
];

const CITIES = ["Lucknow","Patna","Bhopal","Jaipur","Indore","Kochi","Nagpur","Surat","Kanpur","Madurai"];
const STREETS = ["MG Road","Gandhi Nagar","Nehru Street","Lake View","Ring Road","Civil Lines","Station Road","Park Avenue"];

const INCOME_BRACKETS = [
  48000, 55000, 68000, 78000, 92000,
  1150000,
  96000, 680000, 85000,
  105000, 132000, 180000, 240000,
  72000, 190000, 420000
];

const pad = (n, l) => String(n).padStart(l, "0");
const collapseDoubles = (s) => s.replace(/(.)\1/g, "$1");

const citizens = [];

for (let i = 0; i < 50; i++) {
  const first = FIRST[i];
  const [last, caste] = LAST[i % LAST.length];
  const name = `${first} ${last}`;
  const aadhaar = `${pad(2000 + i, 4)}${pad(100000 + i * 7919, 8)}`;
  const year = 1950 + ((i * 7) % 63);
  const month = (i % 12) + 1;
  const day = (i % 27) + 1;
  const dob = `${year}-${pad(month, 2)}-${pad(day, 2)}`;
  const gender = i % 2 === 0 ? "MALE" : "FEMALE";

  let address = `${(i % 90) + 10}, ${STREETS[i % STREETS.length]}, ${CITIES[i % CITIES.length]}`;
  if (i % 13 === 7) address = address.replace("Road", "Rd").replace("Street", "St");

  const annualIncome = INCOME_BRACKETS[(i * 7) % INCOME_BRACKETS.length];
  const category = annualIncome <= 100000 ? "BPL" : "APL";

  let incomeName = name;
  if (i % 8 === 3) incomeName = collapseDoubles(name);
  else if (i % 10 === 6) incomeName = `${first[0]}. ${last}`;

  citizens.push({
    aadhaar, name, dob, gender, caste, address,
    digilocker: { aadhaar, name, dob, gender, caste, address, documents: ["AADHAAR", "VOTER_ID", "PAN", "CASTE_CERTIFICATE"] },
    income: {
      aadhaar, name: incomeName, annualIncome, category,
      certificateNo: `INC-${pad(1001 + i, 4)}`,
      issueDate: `${2015 + (i % 9)}-04-01`,
      exists: i !== 23
    }
  });
}

module.exports = { citizens };