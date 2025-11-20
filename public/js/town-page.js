// In: public/js/town-page.js

document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
    const statusEl = document.getElementById('form-status');
    
    // The town name is embedded in the form's data attribute
    const townName = commentForm.dataset.townName;

    // Function to fetch and display comments
    async function renderComments() {
        if (!commentsList) return;
        commentsList.innerHTML = '<p>Loading historical facts...</p>';

        try {
            const response = await getCommentsForTown(townName);
            if (response.errors) throw new Error(response.errors[0].message);

            const comments = response.data.getCommentsForTown;

            if (comments.length > 0) {
                commentsList.innerHTML = comments.map(comment => `
                    <div class="comment-item">
                        <p class="comment-text">${comment.text}</p>
                        <span class="comment-author">- ${comment.author.username}</span>
                    </div>
                `).join('');
            } else {
                commentsList.innerHTML = '<p>No verified facts have been added for this town yet. Be the first!</p>';
            }
        } catch (error) {
            commentsList.innerHTML = `<p style="color: red;">Could not load facts: ${error.message}</p>`;
        }
    }

    // Attach submit event listener to the form
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = commentForm.querySelector('textarea').value;
            if (!text.trim()) return;

            statusEl.textContent = 'Verifying fact with AI...';
            statusEl.style.color = '#333';

            try {
                const response = await addCommentToTown(townName, text);
                if (response.errors) throw new Error(response.errors[0].message);

                statusEl.textContent = 'Fact verified and added successfully!';
                statusEl.style.color = 'green';
                commentForm.querySelector('textarea').value = '';
                
                // Refresh the comments list
                await renderComments();

            } catch (error) {
                statusEl.textContent = `Error: ${error.message}`;
                statusEl.style.color = 'red';
            }
        });
    }

    // Initial load of comments
    renderComments();
});