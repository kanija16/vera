"""Generate deterministic synthetic academic data for load and demo preparation.

Usage:
    python -m app.generate_dataset --output ../data
"""

import argparse
import json
import random
from pathlib import Path

FIRST_NAMES = ["Aarav", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Meera", "Nikhil", "Priya", "Rohan"]
LAST_NAMES = ["Kumar", "Sharma", "Patel", "Iyer", "Nair", "Das", "Reddy", "Singh", "Joseph", "Mehta"]
CITIES = [("India", "Tamil Nadu", "Chennai"), ("India", "Karnataka", "Bengaluru"), ("India", "Maharashtra", "Pune"), ("India", "Telangana", "Hyderabad")]
DEPARTMENTS = [("Computer Science and Engineering", "CSE"), ("Information Technology", "IT"), ("Electronics and Communication", "ECE"), ("Mechanical Engineering", "ME"), ("Business Administration", "BBA")]
PROGRAMS = [("B.Tech Computer Science", "BTECH-CSE", "BTECH"), ("B.Tech Artificial Intelligence", "BTECH-AI", "BTECH"), ("B.Tech Electronics", "BTECH-ECE", "BTECH"), ("M.Tech Computer Science", "MTECH-CSE", "MTECH")]
COURSES = [("CS401", "Distributed Systems", 4), ("CS402", "Compiler Design", 3), ("CS403", "Applied Machine Learning", 4), ("CS404", "Information Security", 3)]


def generate(output: Path, institutions_count: int = 10, departments_count: int = 50, programs_count: int = 100, students_count: int = 5000, records_count: int = 20000, credentials_count: int = 5000) -> None:
    rng = random.Random(vera_seed := 2026)
    output.mkdir(parents=True, exist_ok=True)
    institutions = []
    for index in range(1, institutions_count + 1):
        country, state, city = CITIES[(index - 1) % len(CITIES)]
        institutions.append({"institution_id": f"INST-{index:04d}", "institution_name": f"VERA {city} Institute of Technology {index}", "institution_type": "University", "country": country, "state": state, "city": city, "accreditation_id": f"ACC-2026-{index:04d}", "official_domain": f"vera-{index:04d}.edu", "registrar_email": f"registrar@vera-{index:04d}.edu", "status": "ACTIVE"})
    departments = [{"department_id": f"DEPT-{index:04d}", "institution_id": institutions[(index - 1) % institutions_count]["institution_id"], "name": DEPARTMENTS[(index - 1) % len(DEPARTMENTS)][0], "code": f"{DEPARTMENTS[(index - 1) % len(DEPARTMENTS)][1]}-{index:02d}"} for index in range(1, departments_count + 1)]
    programs = [{"program_id": f"PROG-{index:04d}", "institution_id": departments[(index - 1) % departments_count]["institution_id"], "department_id": departments[(index - 1) % departments_count]["department_id"], "name": PROGRAMS[(index - 1) % len(PROGRAMS)][0], "code": f"{PROGRAMS[(index - 1) % len(PROGRAMS)][1]}-{index:02d}", "degree_type": PROGRAMS[(index - 1) % len(PROGRAMS)][2], "duration_years": 4, "total_semesters": 8} for index in range(1, programs_count + 1)]
    students = []
    for index in range(1, students_count + 1):
        program = programs[(index - 1) % programs_count]
        name = f"{FIRST_NAMES[(index - 1) % len(FIRST_NAMES)]} {LAST_NAMES[((index - 1) // len(FIRST_NAMES)) % len(LAST_NAMES)]}"
        admission_year = 2022 + (index % 5)
        students.append({"student_id": f"STU-{index:06d}", "matriculation_number": f"VERA{admission_year % 100:02d}{index:06d}", "full_name": name, "email": f"student{index:06d}@example.edu", "institution_id": program["institution_id"], "department_id": program["department_id"], "program_id": program["program_id"], "admission_year": admission_year, "expected_graduation_year": admission_year + 4, "academic_status": "ACTIVE"})
    records = []
    for index in range(1, records_count + 1):
        student = students[(index - 1) % students_count]
        course = COURSES[(index - 1) % len(COURSES)]
        semester = ((index - 1) % 8) + 1
        records.append({"record_id": f"REC-{index:07d}", "student_id": student["student_id"], "institution_id": student["institution_id"], "credential_type": "SEMESTER_TRANSCRIPT", "semester": semester, "academic_year": f"{student['admission_year'] + (semester - 1) // 2}-{student['admission_year'] + (semester - 1) // 2 + 1}", "course_code": course[0], "course_name": course[1], "credits": course[2], "grade": rng.choice(["A+", "A", "B+", "B"]), "status": "APPROVED"})
    credentials = [{"credential_id": f"CRED-{index:07d}", "record_id": records[(index - 1) % records_count]["record_id"], "student_id": records[(index - 1) % records_count]["student_id"], "credential_type": records[(index - 1) % records_count]["credential_type"], "status": "ACTIVE", "batch_id": f"BATCH-2026-{((index - 1) // 100) + 1:04d}"} for index in range(1, credentials_count + 1)]
    for name, values in {"institutions": institutions, "departments": departments, "programs": programs, "students": students, "academic_records": records, "credentials": credentials}.items():
        (output / f"{name}.json").write_text(json.dumps({"seed": vera_seed, "count": len(values), "items": values}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data"))
    parser.add_argument("--students", type=int, default=5000)
    args = parser.parse_args()
    generate(args.output, students_count=args.students)
