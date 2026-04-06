import random

def generate_task(difficulty: float):
    """
    Generates a logic task based on a difficulty float (0.0 to 1.0).
    The higher the difficulty, the more complex the task.
    """
    # Map 0.0-1.0 to 6 tiers (0-5)
    tier = int(difficulty * 5.99)
    
    # helper for range scaling: returns a value scaled by the difficulty within the tier
    # e.g. for tier 0 (0 to 0.166), it maps difficulty 0.0 -> min_val, 0.166 -> max_val
    def scale(min_val, max_val):
        tier_size = 1.0 / 6.0
        tier_start = tier * tier_size
        tier_end = (tier + 1) * tier_size
        # Normalize local difficulty within this tier (0.0 to 1.0)
        if tier_end > tier_start:
            local_diff = (difficulty - tier_start) / (tier_end - tier_start)
        else:
            local_diff = 1.0
        return int(min_val + (max_val - min_val) * local_diff)

    if tier == 0:
        # Tier 0: Simple Addition/Subtraction
        max_num = scale(15, 65)
        op = random.choice(['+', '-'])
        a = random.randint(5, max_num)
        b = random.randint(5, max_num)
        if op == '-':
            a, b = max(a, b), min(a, b)
        return {"question": f"{a} {op} {b}", "answer": eval(f"{a} {op} {b}"), "level": 1}

    elif tier == 1:
        # Tier 1: Simple Multiplication/Division
        max_tbl = scale(8, 15)
        op = random.choice(['*', '/'])
        if op == '*':
            a = random.randint(2, max_tbl)
            b = random.randint(2, 12)
            return {"question": f"{a} × {b}", "answer": a * b, "level": 1}
        else:
            b = random.randint(2, max_tbl)
            res = random.randint(2, 12)
            a = b * res
            return {"question": f"{a} ÷ {b}", "answer": res, "level": 1}

    elif tier == 2:
        # Tier 2: Multi-step Arithmetic & Percentages
        type = random.choice(['multi_step', 'percentage'])
        if type == 'multi_step':
            a = scale(5, 15)
            b = scale(2, 10)
            c = scale(2, 6)
            return {"question": f"({a} + {b}) × {c}", "answer": (a + b) * c, "level": 2}
        else:
            pcts = [10, 20, 25, 50] if difficulty < 0.4 else [10, 25, 50, 75, 125]
            p = random.choice(pcts)
            base = random.choice([20, 40, 60, 80, 100, 200])
            return {"question": f"{p}% of {base}", "answer": int(base * p / 100), "level": 2}

    elif tier == 3:
        # Tier 3: Comparisons and Fractions
        type = random.choice(['comp', 'fraction'])
        if type == 'fraction':
            denominators = [2, 3, 4, 5, 10]
            d = random.choice(denominators)
            n = random.randint(1, d - 1)
            base = d * random.randint(2, 10)
            return {"question": f"{n}/{d} of {base}", "answer": int(base * n / d), "level": 3}
        else:
            a, b = random.randint(20, 100), random.randint(20, 100)
            target = random.randint(50, 180)
            correct = (a + b) > target
            return {"question": f"{a} + {b} > {target}?", "answer": "TRUE" if correct else "FALSE", "level": 3}

    elif tier == 4:
        # Tier 4: Basic Algebra & Modulo
        type = random.choice(['algebra', 'modulo'])
        if type == 'algebra':
            a = random.randint(2, 5)
            x = random.randint(2, 12)
            b = random.randint(1, 20)
            c = a * x + b
            return {"question": f"{a}x + {b} = {c}, x=?", "answer": x, "level": 4}
        else:
            a = scale(20, 120)
            b = random.randint(3, 11)
            return {"question": f"{a} mod {b}", "answer": a % b, "level": 4}

    else:
        # Tier 5: Sequences & Advanced Nested
        type = random.choice(['sequence', 'complex'])
        if type == 'sequence':
            start = random.randint(1, 10)
            seq_type = random.choice(['geo', 'square', 'fib'])
            if seq_type == 'geo':
                r = random.choice([2, 3])
                seq = [start * (r**i) for i in range(4)]
                return {"question": f"{seq[0]}, {seq[1]}, {seq[2]}, ...?", "answer": seq[3], "level": 5}
            elif seq_type == 'square':
                base = random.randint(2, 8)
                seq = [(base+i)**2 for i in range(4)]
                return {"question": f"{seq[0]}, {seq[1]}, {seq[2]}, ...?", "answer": seq[3], "level": 5}
            else:
                s = [random.randint(1, 5)]
                s.append(random.randint(1, 5))
                for _ in range(2): s.append(s[-1] + s[-2])
                return {"question": f"{s[0]}, {s[1]}, {s[2]}, ...?", "answer": s[3], "level": 5}
        else:
            a, b, c = random.randint(10, 20), random.randint(2, 5), random.randint(2, 8)
            return {"question": f"({a} × {b}) - {c}", "answer": a * b - c, "level": 5}
