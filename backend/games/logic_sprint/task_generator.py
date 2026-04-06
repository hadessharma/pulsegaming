import random

def generate_task(elapsed_seconds: float):
    # Determine difficulty level (1-4)
    if elapsed_seconds < 15:
        level = 1
    elif elapsed_seconds < 30:
        level = 2
    elif elapsed_seconds < 45:
        level = 3
    else:
        level = 4

    if level == 1:
        # Double-digit addition/subtraction, 1-12 multiplication
        op = random.choice(['+', '-', '*'])
        if op in ['+', '-']:
            a = random.randint(10, 50)
            b = random.randint(10, 50)
            if op == '-':
                a, b = max(a, b), min(a, b)
            return {"question": f"{a} {op} {b}", "answer": eval(f"{a} {op} {b}"), "level": 1}
        else:
            a = random.randint(2, 12)
            b = random.randint(2, 12)
            return {"question": f"{a} × {b}", "answer": a * b, "level": 1}

    elif level == 2:
        # Harder multiplication, division, comparison gates
        type = random.choice(['arithmetic', 'comparison', 'division'])
        if type == 'arithmetic':
            a = random.randint(11, 20)
            b = random.randint(11, 20)
            return {"question": f"{a} × {b}", "answer": a * b, "level": 2}
        elif type == 'division':
            b = random.randint(2, 12)
            res = random.randint(5, 15)
            a = b * res
            return {"question": f"{a} ÷ {b}", "answer": res, "level": 2}
        else:
            a = random.randint(20, 60)
            b = random.randint(20, 60)
            target = random.randint(40, 120)
            correct = (a + b) > target
            return {"question": f"{a} + {b} > {target}?", "answer": "TRUE" if correct else "FALSE", "level": 2}

    elif level == 3:
        # Three-number operations and percentages
        type = random.choice(['three_op', 'percentage'])
        if type == 'three_op':
            a = random.randint(10, 30)
            b = random.randint(2, 10)
            c = random.randint(5, 20)
            op1, op2 = random.choice(['+', '*']), random.choice(['+', '-'])
            if op1 == '*':
                question = f"({a} × {b}) {op2} {c}"
                answer = a * b + (c if op2 == '+' else -c)
            else:
                question = f"{a} + {b} + {c}"
                answer = a + b + c
            return {"question": question, "answer": answer, "level": 3}
        else:
            pcts = [10, 20, 25, 50, 75]
            p = random.choice(pcts)
            base = random.choice([40, 80, 120, 200, 400])
            return {"question": f"{p}% of {base}", "answer": int(base * p / 100), "level": 3}

    else:
        # Level 4: Sequences, Nested, Modulo
        type = random.choice(['sequence', 'nested', 'modulo'])
        if type == 'sequence':
            start = random.randint(1, 10)
            step = random.randint(2, 5)
            # Arithmetic with increasing step? Or geometric?
            # Let's do geometric or squared
            seq_type = random.choice(['geo', 'square'])
            if seq_type == 'geo':
                r = random.choice([2, 3])
                seq = [start * (r**i) for i in range(4)]
                return {"question": f"{seq[0]}, {seq[1]}, {seq[2]}, _?", "answer": seq[3], "level": 4}
            else:
                base = random.randint(2, 5)
                seq = [(base+i)**2 for i in range(4)]
                return {"question": f"{seq[0]}, {seq[1]}, {seq[2]}, _?", "answer": seq[3], "level": 4}
        elif type == 'modulo':
            a = random.randint(20, 100)
            b = random.randint(3, 9)
            return {"question": f"{a} mod {b}", "answer": a % b, "level": 4}
        else:
            # Nested
            a, b, c = random.randint(2, 10), random.randint(2, 10), random.randint(2, 10)
            return {"question": f"({a} + {b}) × {c}", "answer": (a + b) * c, "level": 4}
