// In: public/js/interactive-map.js

const namibiaTowns = [
    { name: 'Windhoek', lat: -22.5594, lng: 17.0832 },
    { name: 'Swakopmund', lat: -22.678, lng: 14.532 },
    { name: 'Walvis Bay', lat: -22.957, lng: 14.505 },
    { name: 'Oshakati', lat: -17.783, lng: 15.683 },
    { name: 'Rundu', lat: -17.917, lng: 19.767 },
    { name: 'Keetmanshoop', lat: -26.583, lng: 18.133 },
    { name: 'Tsumeb', lat: -19.25, lng: 17.7167 },
    { name: 'Lüderitz', lat: -26.647, lng: 15.159 },
    { name: 'Gobabis', lat: -22.45, lng: 18.9667 },
    { name: 'Katima Mulilo', lat: -17.503, lng: 24.272 }
];

async function initializeInteractiveMap(containerId) {
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer || mapContainer.dataset.initialized === 'true') {
        return;
    }

    const helperStyles = `
        .connectivity-helper {
            background-color: #f0f8ff;
            border: 1px solid #b0e0e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .connectivity-helper-qr {
            flex-shrink: 0;
        }
        .connectivity-helper-qr img {
            width: 120px;
            height: 120px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .connectivity-helper-text h5 {
            margin-top: 0;
            font-family: var(--font-sans);
            font-weight: 600;
        }
        .connectivity-helper-text p {
            margin-bottom: 0;
            font-size: 0.9rem;
        }
        @media(max-width: 600px) {
            .connectivity-helper {
                flex-direction: column;
                text-align: center;
            }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = helperStyles;
    document.head.appendChild(styleSheet);


    const map = L.map(containerId, {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true
    });

    const namibiaBounds = [[-28.97, 12.18], [-16.97, 25.26]];
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    if (containerId === 'leaflet-map') {
        const mapPageContainer = document.querySelector('#map .map-section .container');
        const helperContainer = document.createElement('div');
        helperContainer.id = 'connectivity-helper-container';
        mapPageContainer.insertBefore(helperContainer, mapContainer.parentNode);

        async function renderWifiHelper() {
            try {
                const response = await getWifiQrCode();
                if (response.errors) throw new Error(response.errors[0].message);
                
                const qrCode = response.data.getWifiQrCode;
                if (qrCode && qrCode.dataUrl) {
                    helperContainer.innerHTML = `
                        <div class="connectivity-helper">
                            <div class="connectivity-helper-qr">
                                <img src="${qrCode.dataUrl}" alt="Wi-Fi Connection QR Code">
                            </div>
                            <div class="connectivity-helper-text">
                                <h5>Local Testing Guide</h5>
                                <p><strong>Step 1:</strong> Scan the QR code on the left with your phone to connect to the local Wi-Fi network.</p>
                                <p><strong>Step 2:</strong> Once connected, click a town marker on the map below to get a unique QR code for that location.</p>
                            </div>
                        </div>`;
                }
            } catch (error) {
                console.warn("Could not render Wi-Fi helper:", error.message);
            }
        }
        renderWifiHelper();

        namibiaTowns.forEach(town => {
            const marker = L.marker([town.lat, town.lng]).addTo(map);
            const popupEl = document.createElement('div');
            popupEl.className = 'map-popup-container';
            
            marker.bindPopup(popupEl, { minWidth: 200 });

            marker.on('popupopen', async () => {
                const townId = town.name.replace(/\s+/g, '');
                popupEl.innerHTML = `
                    <h4>${town.name}</h4>
                    <div class="qr-code-section">
                        <div class="qr-code-container-popup" id="qr-for-${townId}">
                            <p>Generating QR Code...</p>
                        </div>
                        <p style="font-size: 0.8rem; margin-top: 5px;">Scan to open this town's page on your device.</p>
                    </div>`;
                
                const qrContainer = document.getElementById(`qr-for-${townId}`);
                
                try {
                    const response = await getQrCodeForTown(town.name);
                    if (response.errors) throw new Error(response.errors[0].message);

                    const qrCode = response.data.getQrCodeForTown;
                    qrContainer.innerHTML = `<img src="${qrCode.dataUrl}" alt="QR Code for ${town.name}" style="width:180px; height:180px; margin:auto;">`;
                } catch (error) {
                    qrContainer.innerHTML = `<p style="color: red; font-size: 0.8rem;">Error: ${error.message}</p>`;
                }
            });
        });
        
    } else {
        try {
            const response = await getAllLocations();
            if (response.errors) throw new Error(response.errors[0].message);
            const locations = response.data.getAllLocations;

            locations.forEach(location => {
                const marker = L.marker([location.coordinates.lat, location.coordinates.lng]).addTo(map);
                const popupEl = document.createElement('div');
                popupEl.className = 'map-popup-container';

                marker.bindPopup(popupEl);

                marker.on('popupopen', async () => {
                    popupEl.innerHTML = `
                        <h4>${location.name}</h4>
                        <p>${location.description}</p>
                        <div class="comments-section">
                            <h5>Historical Facts & Comments</h5>
                            <div class="comments-list" id="comments-for-${location.id}"><p>Loading facts...</p></div>
                            <form class="comment-form" data-location-id="${location.id}">
                                <textarea name="comment" placeholder="Add a verified Namibian historical fact..." required></textarea>
                                <button type="submit">Submit</button>
                                <small class="form-status"></small>
                            </form>
                        </div>
                    `;
                    await renderComments(location.id);
                    attachFormListener(popupEl.querySelector('.comment-form'));
                });
            });

        } catch (error) {
            console.error("Failed to load map locations:", error);
            mapContainer.innerHTML = `<p style="text-align: center; padding: 20px;">Could not load map locations. Please try again later.</p>`;
        }
    }

    async function renderComments(locationId) {
        const commentsList = document.getElementById(`comments-for-${locationId}`);
        try {
            const response = await getCommentsForLocation(locationId);
            if (response.errors) throw new Error(response.errors[0].message);
            const comments = response.data.getComments;
            if (comments.length > 0) {
                commentsList.innerHTML = comments.map(comment => `
                    <div class="comment-item">
                        <p class="comment-text">${comment.text}</p>
                        <span class="comment-author">- ${comment.author.username}</span>
                    </div>
                `).join('');
            } else {
                commentsList.innerHTML = '<p>No facts have been added for this location yet.</p>';
            }
        } catch (error) {
            commentsList.innerHTML = '<p>Could not load facts.</p>';
        }
    }

    function attachFormListener(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const locationId = form.dataset.locationId;
            const text = form.querySelector('textarea').value;
            const statusEl = form.querySelector('.form-status');

            statusEl.textContent = 'Verifying fact with AI...';
            try {
                const response = await addComment(locationId, text);
                if (response.errors) throw new Error(response.errors[0].message);
                
                statusEl.textContent = 'Fact verified and added!';
                statusEl.style.color = 'green';
                form.querySelector('textarea').value = '';
                await renderComments(locationId);
            } catch (error) {
                statusEl.textContent = `Error: ${error.message}`;
                statusEl.style.color = 'red';
            }
        });
    }

    L.control.scale({ imperial: false }).addTo(map);
    mapContainer.dataset.initialized = 'true';

    setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(namibiaBounds, { padding: [20, 20] });
    }, 100);
}