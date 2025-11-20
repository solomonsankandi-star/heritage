// In: public/js/api.js

const GRAPHQL_ENDPOINT = '/graphql';

// --- Helper Function ---
async function fetchGraphQL(query, variables = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query, variables })
        });
        return response.json();
    } catch (error) {
        console.error("Network or GraphQL fetch error:", error);
        return { errors: [{ message: "Network error." }] };
    }
}

// --- Location API Functions ---
function getAllLocations() {
    const query = `
        query {
            getAllLocations {
                id
                name
                description
                coordinates {
                    lat
                    lng
                }
            }
        }
    `;
    return fetchGraphQL(query);
}

// --- User Mutations ---
function loginUser(email, password) {
    const mutation = `
        mutation($email: String!, $password: String!) {
            login(email: $email, password: $password) {
                token
                user { id, username, role }
            }
        }
    `;
    return fetchGraphQL(mutation, { email, password });
}

// --- Comment API Functions ---
function getCommentsForLocation(locationId) {
    const query = `
        query($locationId: ID!) {
            getComments(locationId: $locationId) {
                id
                text
                author {
                    username
                }
                createdAt
            }
        }
    `;
    return fetchGraphQL(query, { locationId });
}

function addComment(locationId, text) {
    const mutation = `
        mutation($locationId: ID!, $text: String!) {
            addComment(locationId: $locationId, text: $text) {
                id
            }
        }
    `;
    return fetchGraphQL(mutation, { locationId, text });
}

// --- QR Code API Function ---
function getQrCodeForLocation(locationId) {
    const query = `
        query($locationId: ID!) {
            getQrCodeForLocation(locationId: $locationId) {
                id
                dataUrl
            }
        }
    `;
    return fetchGraphQL(query, { locationId });
}

// --- REPLACED FUNCTION ---
function getQrCodeForTown(townName) {
    const query = `
        query($townName: String!) {
            getQrCodeForTown(townName: $townName) {
                dataUrl
            }
        }
    `;
    return fetchGraphQL(query, { townName });
}

// --- WI-FI API FUNCTION ---
function getWifiQrCode() {
    const query = `
        query {
            getWifiQrCode {
                dataUrl
            }
        }
    `;
    return fetchGraphQL(query);
}

// --- TOWN COMMENT API FUNCTIONS ---
function getCommentsForTown(townName) {
    const query = `
        query($townName: String!) {
            getCommentsForTown(townName: $townName) {
                id
                text
                author {
                    username
                }
                createdAt
            }
        }
    `;
    return fetchGraphQL(query, { townName });
}

function addCommentToTown(townName, text) {
    const mutation = `
        mutation($townName: String!, $text: String!) {
            addCommentToTown(townName: $townName, text: $text) {
                id
            }
        }
    `;
    return fetchGraphQL(mutation, { townName, text });
}


// --- Site-wide Image Mutations (for visual editor) ---
function uploadImage(key, description, file) {
    const query = `mutation($key: String!, $description: String, $file: Upload!) { uploadSiteImage(key: $key, description: $description, file: $file) { id, key, imageUrl } }`;
    const formData = new FormData();
    formData.append('operations', JSON.stringify({ query, variables: { key, description, file: null } }));
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', file);
    return fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData,
    }).then(res => res.json());
}

function deleteImage(key) {
    const mutation = `mutation($key: String!) { deleteSiteImage(key: $key) { id, key } }`;
    return fetchGraphQL(mutation, { key });
}

// --- Text Mutation ---
function updateText(key, content, page, description) {
    const mutation = `
        mutation($key: String!, $content: String!, $page: String, $description: String) {
            updateTextContent(key: $key, content: $content, page: $page, description: $description) {
                id, key, content
            }
        }
    `;
    return fetchGraphQL(mutation, { key, content, page, description });
}

// --- Historical Event API Functions ---
function uploadEventImage(file) {
    const formData = new FormData();
    formData.append('eventImage', file);
    return fetch('/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
    }).then(res => {
        if (!res.ok) {
            return res.json().then(errorBody => { throw new Error(errorBody.error || 'Image upload failed.') });
        }
        return res.json();
    });
}

function getHistoricalEvents() {
    const query = `
        query {
            getHistoricalEvents {
                id, month, day, title, description, imageUrl, link, isFeatured
            }
        }
    `;
    return fetchGraphQL(query);
}

function addHistoricalEvent(variables) {
    const mutation = `
        mutation($month: Int!, $day: Int!, $title: String!, $description: String!, $imageUrl: String!, $link: String) {
            addHistoricalEvent(month: $month, day: $day, title: $title, description: $description, imageUrl: $imageUrl, link: $link) {
                id
            }
        }
    `;
    return fetchGraphQL(mutation, variables);
}

function updateHistoricalEvent(id, variables) {
    const mutation = `
        mutation($id: ID!, $month: Int, $day: Int, $title: String, $description: String, $imageUrl: String, $link: String) {
            updateHistoricalEvent(id: $id, month: $month, day: $day, title: $title, description: $description, imageUrl: $imageUrl, link: $link) {
                id
            }
        }
    `;
    return fetchGraphQL(mutation, { id, ...variables });
}

function deleteHistoricalEvent(id) {
    const mutation = `
        mutation($id: ID!) {
            deleteHistoricalEvent(id: $id) {
                id
            }
        }
    `;
    return fetchGraphQL(mutation, { id });
}

// --- Featured Event API Functions ---
function setFeaturedEvent(id) {
    const mutation = `mutation($id: ID!) { setFeaturedEvent(id: $id) { id, isFeatured } }`;
    return fetchGraphQL(mutation, { id });
}

function unsetFeaturedEvent() {
    const mutation = `mutation { unsetFeaturedEvent { id, isFeatured } }`;
    return fetchGraphQL(mutation);
}