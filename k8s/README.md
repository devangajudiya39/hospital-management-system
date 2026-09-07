# Kubernetes Horizontal Scaling for HMS (Task 4)

This directory contains the Kubernetes manifests required for deploying and scaling the Hospital Management System horizontally.

## Prerequisites & Image Availability

The K8s manifests rely on the existing local Docker images:
- `hospital_management_system-backend:latest`
- `hospital_management_system-frontend:latest`
- `hospital_management_system-worker:latest`

**Important:** These images must be available to your target local Kubernetes environment. The manifests are configured with `imagePullPolicy: IfNotPresent` to use your locally built images.

If you are using **Minikube**, load the images into the Minikube Docker daemon before deploying:
```bash
minikube image load hospital_management_system-backend:latest
minikube image load hospital_management_system-frontend:latest
minikube image load hospital_management_system-worker:latest
```

If you are using **kind**, load them using:
```bash
kind load docker-image hospital_management_system-backend:latest
kind load docker-image hospital_management_system-frontend:latest
kind load docker-image hospital_management_system-worker:latest
```

If you are using **Docker Desktop Kubernetes**, the locally built images are automatically available to the cluster.

## Deployment Steps

1. **Create Secrets:**
   Create your `secrets.yaml` file from the example before applying the manifests:
   ```bash
   cp k8s/secrets.example.yaml k8s/secrets.yaml
   ```
   Edit `k8s/secrets.yaml` and replace the `<base64-placeholder>` tags with actual Base64-encoded values (e.g. `echo -n "your-mongodb-uri" | base64`).

2. **Apply Manifests:**
   Deploy the entire application (including the new `hms` namespace) by running:
   ```bash
   kubectl apply -f k8s/
   ```

3. **Verify Deployment:**
   Check that all resources are running:
   ```bash
   kubectl get all -n hms
   ```

## Services & Architecture Details

### Redis & RabbitMQ
Redis and RabbitMQ are deployed as single-replica Deployments (`redis.yaml` and `rabbitmq.yaml`) purely for development/demo purposes in Task 4. They are not production HA configurations (no clustering, StatefulSets, or persistent storage). 
MongoDB Atlas remains external and its URI is provided via the secret.

### Frontend Service & Environment
The frontend deployment uses a **NodePort Service** exposed on port `30080`.
You can access the frontend in your browser at:
```
http://localhost:30080
```
*(If you are using Minikube, you can get the access URL by running: `minikube service frontend -n hms --url`)*

**Note on Frontend VITE Variables:** The frontend continues to communicate directly with the deployed Interview API (`https://vps-nisarg-10gb-bjyqw.aiccloud.online`) as it was built into the Vite bundle or dynamically accessed during dev mode. We have deliberately kept `VITE_INTERVIEW_API_BASE_URL` out of the K8s Pod configuration to avoid exposing backend logic or overriding the existing external API unnecessarily. The browser communicates with the interview API directly.

### Backend Horizontal Scaling
The backend is scaled dynamically via a HorizontalPodAutoscaler (`backend-hpa.yaml`).
- **Initial Replicas:** 2
- **Max Replicas:** 5
- **Target CPU Utilization:** 60%

To observe the HPA in action, your Kubernetes cluster must have **Metrics Server** installed. You can verify it via:
```bash
kubectl top pods -n hms
```
If Metrics Server is not installed, the HPA will show `<unknown>` for metrics and will not dynamically scale.

### Docker Compose
The existing Docker Compose deployment at `ops/docker-compose.yml` remains fully functional for local non-K8s development.
