import asyncio
import time
from services.cf_client import cf_client
from services.contest_manager import manager
from domain.models import ContestState

class Poller:
    def __init__(self, interval: int = 10):
        self.interval = interval
        self.running = False

    async def start(self):
        self.running = True
        while self.running:
            status = await manager.get_admin_status()
            contest_info = status["contest"]
            start_time = contest_info["start_time"]
            duration = contest_info["duration"]
            state = contest_info["state"]

            now = int(time.time())

            if state == ContestState.FINISHED and start_time + duration > now:
                print("Contest switched back to running state")
                await manager.set_contest_state(ContestState.RUNNING)
                await manager.save_state()
                
            if state != ContestState.RUNNING:
                print("Contest is not in running state. Poller is not polling.")
                await asyncio.sleep(self.interval)
                continue

            print("Running state. Poller is polling.")

            if start_time <= now <= start_time + duration:
                print("Poller is fetching submissions.")
                try:
                    subs = await asyncio.to_thread(cf_client.get_recent_status, count=500)
                    if subs:
                        await manager.process_submissions(subs)
                        await manager.save_state()
                except Exception as e:
                    print(f"Poller iteration failed: {e}")
            elif now > start_time + duration:
                print("Contest has finished. Poller will stop fetching submissions.")
                await manager.set_contest_state(ContestState.FINISHED)
                await manager.save_state()
            
            await asyncio.sleep(self.interval)

    def stop(self):
        self.running = False

poller = Poller()
