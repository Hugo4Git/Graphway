# Graphway

Graphway is a web-based platform designed for organizing and running algorithmic contests using task-graphs. It enables administrators to create interactive problem graphs where nodes represent problems that participating teams must solve to unlock new paths. The system facilitates real-time competition management, automated scoring, and live progress tracking to provide an engaging experience for both organizers and participants.

## 🚀 Deployment / How to Run

The easiest way to run the platform is using Docker Compose. This ensures all dependencies are set up correctly, including a public access tunnel.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/) (optional, for convenience scripts)

### Steps

1. **Build and Run**:
   Open a terminal in the project root directory and run:
   ```bash
   make up
   ```
   *Alternatively, you can use: `docker compose -f deployment/docker-compose.yml up --build --attach access-printer`*

2. **Access the App**:
   The application is accessible locally and via a secure public tunnel. The **Admin Token** and **Public URL** will be automatically displayed in the terminal logs once the app starts. Look for the **contest-access-printer** output:

   ```
   access-printer  | =================================================
   access-printer  |                   ACCESS INFO                   
   access-printer  | =================================================
   access-printer  | 
   access-printer  | 🔑 Admin Token: <your-token>
   access-printer  | 🌍 Public URL:  https://<random-name>.trycloudflare.com
   ```

   - **Local Frontend**: [http://localhost](http://localhost)
   - **Local Backend API**: [http://localhost:8000/api/](http://localhost:8000/api/)
   - **Public URL**: See terminal output above.

3. **Stop the App**:
   Run:
   ```bash
   make down
   ```

## 🔧 Custom Domain Setup

To use your own domain instead of the temporary `trycloudflare.com` URL:

1.  Create a tunnel in Cloudflare, pick docker environment.
2.  Update `deployment/docker-compose.yml`:
    ```yaml
    tunnel:
      image: cloudflare/cloudflared:latest
      container_name: contest-tunnel
      command: tunnel run --token ${TUNNEL_TOKEN}
      environment:
         - TUNNEL_TOKEN=${TUNNEL_TOKEN}
      depends_on:
         - frontend
      restart: unless-stopped
    ```
3.  Set the public hostname to your domain and point the service to `http://frontend:80`.