import { Modal, View, Text, ActivityIndicator, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import ImageViewer from "react-native-image-zoom-viewer";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { Report } from "../../shared/types";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function ReportDetails() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const [report, setReport] = useState<Report | null>(null);
	const [loading, setLoading] = useState(true);
	const [imageViewerVisible, setImageViewerVisible] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);

	const [selectedReport, setSelectedReport] = useState<Report | null>(null);
	useEffect(() => {
		if (!id) return;
		setLoading(true);
		fetch(`${BACKEND_URL}/api/reports/id/${id}`)
			.then((res) => res.json())
			.then((data) => setReport(data))
			.catch(console.error)
			.finally(() => setLoading(false));
	}, [id]);

	async function generateAndDownloadPdf(reportId: string) {
		try {
			// 1️⃣ Call the server endpoint that generates the PDF and returns it
			const url = `${BACKEND_URL}/api/reports/pdf/${reportId}`;
			const response = await fetch(url);

			if (!response.ok) throw new Error("Failed to generate PDF");

			// 2️⃣ Create local file object
			const fileName = `server_${reportId}.pdf`;
			const localFile = new File(Paths.cache, fileName);

			// 3️⃣ Write PDF bytes to local file
			const bytes = await response.arrayBuffer();
			localFile.write(new Uint8Array(bytes));

			console.log("PDF saved at:", localFile.uri);

			// 4️⃣ Share or open the PDF
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(localFile.uri);
			} else {
				console.log("PDF ready to use at:", localFile.uri);
			}
		} catch (err) {
			console.error("Error generating/downloading PDF:", err);
		}
	}

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator color="#1268B0" size="large" />
				<Text style={{ marginTop: 10 }}>Lädt Bericht…</Text>
			</View>
		);
	}

	if (!report) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>Bericht nicht gefunden</Text>
				<TouchableOpacity onPress={() => router.back()}>
					<Text style={styles.link}>← Zurück</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const imagesForViewer = (report?.images ?? []).map((img) => ({
		url: `${BACKEND_URL}${img}`,
	}));

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={22} color="#1268B0" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Berichtdetails</Text>
				<View style={{ width: 48 }}>
					{" "}
					<TouchableOpacity
						onPress={() => selectedReport && generateAndDownloadPdf(selectedReport._id!)}
						style={[styles.addButton, { backgroundColor: "#1268B0" }]}
					>
						<Text style={styles.addButtonText}>PDF erstellen</Text>
					</TouchableOpacity>{" "}
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
				{/* Title */}
				<Text style={styles.title}>{report.title || "Ohne Titel"}</Text>

				{/* Metadata */}
				<View style={styles.metaCard}>
					<Text style={styles.metaText}>Von: {report.userEmail}</Text>

					{report.createdAt && (
						<>
							<Text style={styles.metaText}>Datum: {new Date(report.createdAt).toLocaleDateString()}</Text>
							<Text style={styles.metaText}>
								Zeit:{" "}
								{new Date(report.createdAt).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Text>
						</>
					)}

					<View style={styles.badgeRow}>
						<View style={[styles.stateBadge, report.isDamaged ? styles.badgeDamaged : styles.badgeOk]}>
							<Ionicons name={report.isDamaged ? "alert-circle" : "checkmark-circle"} size={16} color="#fff" style={{ marginRight: 4 }} />
							<Text style={styles.badgeText}>{report.isDamaged ? "Defekt" : "Okay"}</Text>
						</View>
					</View>
				</View>

				{/* Description */}
				<Text style={styles.sectionTitle}>Beschreibung</Text>
				<View style={styles.descCard}>
					<Text style={styles.desc}>{report.description || "Keine Beschreibung angegeben."}</Text>
				</View>

				{/* Images */}

				{report.images && report.images.length > 0 && (
					<View style={styles.imageSection}>
						<Text style={styles.sectionTitle}>Bilder</Text>
						{report.images.map((img, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => {
									setSelectedImageIndex(index);
									setImageViewerVisible(true);
								}}
								activeOpacity={0.9}
							>
								<View style={styles.imageCard}>
									<Image source={{ uri: `${BACKEND_URL}${img}` }} style={styles.image} />
								</View>
							</TouchableOpacity>
						))}
					</View>
				)}
			</ScrollView>

			{/* Image Viewer Modal */}
			<Modal visible={imageViewerVisible} transparent onRequestClose={() => setImageViewerVisible(false)}>
				<View style={{ flex: 1, backgroundColor: "#000" }}>
					<ImageViewer
						imageUrls={imagesForViewer}
						index={selectedImageIndex}
						enableSwipeDown
						onSwipeDown={() => setImageViewerVisible(false)}
						saveToLocalByLongPress={false}
						backgroundColor="#000"
						renderIndicator={(current, total) => (
							<View style={styles.imageCounterContainer}>
								<Text style={styles.imageCounterText}>
									{current} / {total}
								</Text>
							</View>
						)}
					/>
					<TouchableOpacity style={styles.closeButton} onPress={() => setImageViewerVisible(false)} activeOpacity={0.8}>
						<Ionicons name="close" size={30} color="#fff" />
					</TouchableOpacity>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
		padding: 16,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 40,
		paddingBottom: 12,
	},
	headerTitle: {
		color: "#1268B0",
		fontSize: 28,
		fontWeight: "700",
	},
	backButton: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},

	contentContainer: {
		paddingBottom: 40,
	},

	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
	},

	title: {
		fontSize: 26,
		fontWeight: "700",
		color: "#1268B0",
		marginBottom: 14,
	},

	metaCard: {
		backgroundColor: "#fff",
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e6eef8",
		marginBottom: 20,
	},
	metaText: {
		color: "#1268B0",
		fontWeight: "600",
		fontSize: 14,
	},

	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1268B0",
		marginBottom: 8,
	},
	descCard: {
		backgroundColor: "#fff",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e6eef8",
		padding: 12,
		marginBottom: 20,
	},
	desc: {
		fontSize: 16,
		color: "#333",
		lineHeight: 22,
	},

	imageSection: {
		gap: 12,
		marginBottom: 30,
	},
	imageCard: {
		backgroundColor: "#fff",
		borderRadius: 12,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		borderWidth: 1,
		borderColor: "#e6eef8",
	},
	image: {
		width: "100%",
		height: 240,
		resizeMode: "cover",
	},

	badgeRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 8,
	},
	stateBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	badgeDamaged: { backgroundColor: "#dc3545" },
	badgeOk: { backgroundColor: "#22bb33" },
	badgeText: { color: "#fff", fontWeight: "700", fontSize: 14 },

	error: { color: "red", fontSize: 18 },
	link: { color: "#1877f2", marginTop: 10 },

	closeButton: {
		position: "absolute",
		top: 60,
		right: 20,
		zIndex: 20,
		backgroundColor: "rgba(0,0,0,0.4)",
		borderRadius: 20,
		padding: 6,
	},
	imageCounterContainer: {
		position: "absolute",
		bottom: 40,
		alignSelf: "center",
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 14,
	},
	imageCounterText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	addButton: {
		width: "100%",
		backgroundColor: "#1268B0",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 12,
	},
	addButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
