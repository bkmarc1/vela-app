import logging
from datetime import datetime
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("vela.sync")

class SyncManager:
    """Manage data syncing from multiple sources"""
    
    def __init__(self, db, airbnb_service, airdna_service):
        self.db = db
        self.airbnb = airbnb_service
        self.airdna = airdna_service
    
    async def sync_listings(self, location: str, user_id: str) -> Dict[str, Any]:
        """
        Sync listings from Airbnb for a location
        
        Args:
            location: Location to sync (e.g., "Koufonisia, Greece")
            user_id: User performing sync
        
        Returns:
            Sync status and results
        """
        try:
            logger.info(f"Starting sync for {location}")
            
            # Fetch from Airbnb
            listings = await self.airbnb.search_listings(
                location=location,
                checkin="2026-06-01",
                checkout="2026-06-08"
            )
            
            # Store in database
            sync_results = {
                "location": location,
                "listings_fetched": len(listings),
                "source": "airbnb",
                "synced_at": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
            
            # Save sync record
            await self.db.sync_history.insert_one(sync_results)
            
            logger.info(f"Synced {len(listings)} listings for {location}")
            return sync_results
            
        except Exception as e:
            logger.error(f"Sync error: {e}")
            return {"error": str(e), "location": location}
    
    async def sync_market_data(self, city: str, country: str, user_id: str) -> Dict[str, Any]:
        """Sync market analytics from AirDNA"""
        try:
            logger.info(f"Syncing market data for {city}, {country}")
            
            # Fetch market data
            market_data = await self.airdna.get_market_data(city, country)
            
            if market_data:
                market_data["user_id"] = user_id
                market_data["synced_at"] = datetime.utcnow().isoformat()
                
                # Store in database
                await self.db.market_data.update_one(
                    {"city": city, "country": country},
                    {"$set": market_data},
                    upsert=True
                )
            
            return market_data or {"error": "Failed to fetch market data"}
            
        except Exception as e:
            logger.error(f"Market sync error: {e}")
            return {"error": str(e)}
    
    async def get_sync_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's sync history"""
        try:
            history = await self.db.sync_history.find(
                {"user_id": user_id}
            ).sort("synced_at", -1).limit(limit).to_list(None)
            
            return history or []
            
        except Exception as e:
            logger.error(f"Error fetching sync history: {e}")
            return []