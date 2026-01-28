import requests
import time
import random
from typing import List, Dict, Optional

class CFClient:
    """Class for fetching problems and status from codeforces"""
    BASE_URL = "https://codeforces.com/api"

    def __init__(self):
        self.problems_cache: List[Dict] = []
        self.last_cache_time = 0
        self.CACHE_DURATION = 3600

    def get_problems(self) -> List[Dict]:
        """Fetch the problems from codeforces problemset"""
        try:
            if not self.problems_cache or (time.time() - self.last_cache_time > self.CACHE_DURATION):
                resp = requests.get(f"{self.BASE_URL}/problemset.problems", timeout=5)
                data = resp.json()

                if data['status'] != 'OK':
                    print(f"CF API error: {data.get('comment')}")
                    return []
                
                self.problems_cache = data['result']['problems']
                self.last_cache_time = time.time()
                print(f"Cached {len(self.problems_cache)} problems")
            
            return self.problems_cache

        except Exception as e:
            print(f"error fetching problems from codeforces: {e}")
            return []
        
    def get_random_problem(self, min_rating: int, max_rating: int) -> Optional[Dict]:
        """Draw a random problem from a specified rating range"""
        problems = [
            p for p in self.get_problems()
            if p.get("rating") is not None
            and min_rating <= p["rating"] <= max_rating
        ]
        if not problems:
            return None
        return random.choice(problems)
    
    def get_recent_status(self, count: int = 1000) -> List[Dict]:
        """Fetch recent submissions from Codeforces."""
        try:
            resp = requests.get(f"{self.BASE_URL}/problemset.recentStatus", params={'count': count}, timeout=5)
            data = resp.json()
            
            if data['status'] != 'OK':
                print(f"CF API Error: {data.get('comment')}")
                return []

            return data['result']
        except Exception as e:
            print(f"Error fetching status: {e}")
            return []

cf_client = CFClient()